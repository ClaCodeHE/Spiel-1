// Prüft die Begriffslisten: Anzahl pro Kategorie, Duplikate, fehlende Tipps.
// Aufruf: node tools/check-words.js
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "js", "words");
global.window = {};
for (const f of fs.readdirSync(dir).sort()) require(path.join(dir, f));
const seen = new Map();
let total = 0, problems = 0;
for (const c of window.CATEGORIES) {
  const lines = c.list.split("\n").map(l => l.trim()).filter(Boolean);
  for (const l of lines) {
    const [w, h, extra] = l.split("|").map(s => s && s.trim());
    if (!w || !h || extra !== undefined) { console.log(`FORMAT [${c.name}]: ${l}`); problems++; continue; }
    if (w.toLowerCase() === h.toLowerCase()) { console.log(`TIPP=BEGRIFF [${c.name}]: ${l}`); problems++; }
    const key = w.toLowerCase();
    if (seen.has(key)) { console.log(`DUPLIKAT: "${w}" in ${c.name} und ${seen.get(key)}`); problems++; }
    else seen.set(key, c.name);
  }
  total += lines.length;
  console.log(`${c.name.padEnd(20)} ${lines.length}`);
}
console.log(`GESAMT ${total}`);
process.exit(problems ? 1 : 0);
