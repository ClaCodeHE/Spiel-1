// Prüft die Slides: Pflichtfelder, Typen, Längen, doppelte IDs/Inhalte, Anzahl pro Kategorie.
// Aufruf: node wissen/tools/check-slides.js [datei.js …]
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "js", "data");
global.window = {};
const files = process.argv.slice(2).length
  ? process.argv.slice(2).map(f => path.resolve(f))
  : fs.readdirSync(dir).filter(f => f.endsWith(".js")).sort().map(f => path.join(dir, f));
for (const f of files) {
  const before = (window.SLIDES || []).length;
  try { require(f); } catch (e) { console.log(`SYNTAX ${path.basename(f)}: ${e.message}`); process.exitCode = 1; continue; }
  console.log(`${path.basename(f).padEnd(22)} ${(window.SLIDES || []).length - before}`);
}
const S = window.SLIDES || [];
const CATS = ["politik", "vwl", "geschichte", "bwl", "finanzen"];
const TYPES = {
  fact: ["title", "text"], event: ["year", "title", "text"], number: ["value", "label", "text"],
  flashcard: ["term", "def"], quiz: ["q", "options", "answer", "explain"],
  truefalse: ["q", "answer", "explain"], whatif: ["q", "steps", "text"], order: ["q", "items", "explain"],
};
const LIMITS = { title: 90, text: 340, more: 480, def: 260, label: 70, explain: 360 };
let problems = 0;
const bad = (s, msg) => { console.log(`✗ ${s.id || "?"}: ${msg}`); problems++; };
const ids = new Set(), keys = new Map();
for (const s of S) {
  if (!s.id) bad(s, "keine id");
  else if (ids.has(s.id)) bad(s, "doppelte id"); else ids.add(s.id);
  if (!CATS.includes(s.cat)) bad(s, `cat "${s.cat}"`);
  if (!s.topic) bad(s, "kein topic");
  if (!s.emoji) bad(s, "kein emoji");
  if (![1, 2, 3].includes(s.level)) bad(s, "level");
  const req = TYPES[s.type];
  if (!req) { bad(s, `type "${s.type}"`); continue; }
  for (const k of req) if (s[k] === undefined || s[k] === "") bad(s, `fehlt ${k}`);
  for (const [k, max] of Object.entries(LIMITS)) if (typeof s[k] === "string" && s[k].length > max) bad(s, `${k} zu lang (${s[k].length})`);
  if (s.type === "quiz") {
    if (!Array.isArray(s.options) || s.options.length < 3 || s.options.length > 4) bad(s, "options 3–4");
    else if (!(s.answer >= 0 && s.answer < s.options.length)) bad(s, "answer-Index");
    else if (new Set(s.options).size !== s.options.length) bad(s, "doppelte Option");
  }
  if (s.type === "truefalse" && typeof s.answer !== "boolean") bad(s, "answer muss true/false sein");
  if (s.type === "whatif" && (!Array.isArray(s.steps) || s.steps.length < 3 || s.steps.length > 5)) bad(s, "steps 3–5");
  if (s.type === "order" && (!Array.isArray(s.items) || s.items.length < 3 || s.items.length > 5)) bad(s, "items 3–5");
  const key = (s.q || s.title || s.term || s.label || "").toLowerCase().replace(/\W+/g, "");
  if (key && keys.has(key)) bad(s, `Inhalt doppelt mit ${keys.get(key)}`); else keys.set(key, s.id);
}
console.log("—");
for (const c of CATS) console.log(`${c.padEnd(12)} ${S.filter(s => s.cat === c).length}`);
const byType = {};
for (const s of S) byType[s.type] = (byType[s.type] || 0) + 1;
console.log("Typen:", JSON.stringify(byType));
console.log(`GESAMT ${S.length}, Probleme: ${problems}`);
if (problems) process.exitCode = 1;
