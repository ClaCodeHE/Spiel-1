"use strict";

/* ============================================================
   Wissensfeed – Lernen im Swipe-Format
   ============================================================ */

const SLIDES = (window.SLIDES || []).filter(s => s && s.id);
const BY_ID = new Map(SLIDES.map(s => [s.id, s]));

const CATS = {
  politik:    { name: "Politik",    icon: "🏛️" },
  vwl:        { name: "VWL",        icon: "📈" },
  geschichte: { name: "Geschichte", icon: "🏺" },
  bwl:        { name: "BWL",        icon: "💼" },
  finanzen:   { name: "Finanzen",   icon: "💶" },
};
const CAT_KEYS = Object.keys(CATS);
const TYPE_LABEL = {
  fact: "Fakt", event: "Ereignis", number: "Zahl", flashcard: "Lernkarte", quiz: "Quiz",
  truefalse: "Wahr oder falsch?", whatif: "Was passiert, wenn …?", order: "Reihenfolge",
};
const INTERACTIVE = ["quiz", "truefalse", "flashcard", "order"];
const LEVEL_NAMES = ["Basis", "Fortgeschritten", "Experte"];
const RANKS = ["Neugierig", "Zuhörer", "Leser", "Mitdenker", "Kenner", "Analyst", "Stratege", "Ökonom",
  "Vordenker", "Professor", "Universalgelehrter", "Weiser", "Legende"];
const REVIEW_DAYS = [0, 1, 3, 7, 16, 35]; // Leitner-Boxen
const DAY = 864e5;

/* ---------- Helfer ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const plain = s => String(s ?? "").replace(/\*\*/g, "");
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dateKey = (d = new Date()) => d.toLocaleDateString("sv");
const yesterday = () => dateKey(new Date(Date.now() - DAY));
const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* egal */ } };
const titleOf = s => plain(s.title || s.q || s.term || s.label || "");
const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

/* ---------- Zustand ---------- */
const KEY = "wissensfeed-v1";
function defaults() {
  return {
    xp: 0, seen: {}, liked: {}, saved: {}, ans: {}, review: {}, mastered: 0,
    streak: { count: 0, last: null }, day: { date: dateKey(), seen: 0, correct: 0 },
    goal: 20, best: 0, badges: {}, onboarded: false, combo: 0, bestCombo: 0,
    interests: [...CAT_KEYS], levels: [1, 2, 3], sprintCats: [...CAT_KEYS],
  };
}
let S = (() => {
  try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY)) || {}); }
  catch (e) { return defaults(); }
})();
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* voll/privat */ } }, 250);
}
function ensureDay() { if (S.day.date !== dateKey()) S.day = { date: dateKey(), seen: 0, correct: 0 }; }
function streakNow() { const l = S.streak.last; return l === dateKey() || l === yesterday() ? S.streak.count : 0; }

/* ---------- XP & Level ---------- */
function levelInfo(xp = S.xp) {
  let lv = 1, need = 100, base = 0;
  while (xp >= base + need) { base += need; lv++; need = 100 + (lv - 1) * 60; }
  return { lv, into: xp - base, need, rank: RANKS[Math.min(lv - 1, RANKS.length - 1)] };
}
function addXp(n, el, combo) {
  const before = levelInfo().lv;
  S.xp += n; save();
  if (el) {
    const r = el.getBoundingClientRect();
    const f = h(`<div class="xp-float${combo ? " combo" : ""}">+${n} XP${combo ? ` · ${combo}×🔥` : ""}</div>`);
    f.style.left = (r.left + r.width / 2 - 30) + "px"; f.style.top = (r.top - 6) + "px";
    document.body.appendChild(f); setTimeout(() => f.remove(), 1000);
  }
  const after = levelInfo();
  if (after.lv > before) { confetti(); toast(`🎉 Level ${after.lv}: ${after.rank}!`); }
}

/* ---------- Antworten & Wiederholung ---------- */
function recordAnswer(s, ok, el) {
  ensureDay();
  const a = S.ans[s.id] || (S.ans[s.id] = { r: 0, w: 0 });
  ok ? a.r++ : a.w++;
  const rv = S.review[s.id];
  if (ok) {
    S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo); S.day.correct++;
    const mult = S.combo >= 10 ? 3 : S.combo >= 5 ? 2 : 1;
    addXp(10 * mult, el, S.combo >= 3 ? S.combo : 0);
    if (S.combo === 5 || S.combo === 10 || S.combo % 25 === 0) { confetti(); toast(`🔥 ${S.combo} richtig in Folge!`); }
    if (rv) {
      rv.box++;
      if (rv.box >= REVIEW_DAYS.length) { delete S.review[s.id]; S.mastered++; toast("🧠 Sitzt! Aus der Wiederholung entfernt."); }
      else rv.due = Date.now() + REVIEW_DAYS[rv.box] * DAY;
    }
    vibrate(15);
  } else {
    S.combo = 0;
    S.review[s.id] = { box: 0, due: Date.now() + 10 * 60e3 };
    vibrate([30, 40, 30]);
  }
  save(); checkBadges();
}
function dueReviews() {
  const now = Date.now();
  return Object.entries(S.review).filter(([id, r]) => r.due <= now && BY_ID.has(id)).map(([id]) => id);
}

/* ---------- Gesehen & Tagesziel ---------- */
function markSeen(s) {
  if (S.seen[s.id]) return;
  ensureDay();
  S.seen[s.id] = Date.now(); S.day.seen++;
  addXp(1);
  if (S.day.seen === S.goal && S.streak.last !== dateKey()) {
    S.streak.count = (S.streak.last === yesterday() ? S.streak.count : 0) + 1;
    S.streak.last = dateKey();
    confetti(); toast(`🎯 Tagesziel erreicht! Serie: ${S.streak.count} ${S.streak.count === 1 ? "Tag" : "Tage"} 🔥`);
  }
  save(); updateBar(); checkBadges();
}
function updateBar() {
  ensureDay();
  const p = Math.min(1, S.day.seen / S.goal);
  $("#ring-fg").style.strokeDashoffset = String(94.25 * (1 - p));
  $("#goal-ring").classList.toggle("done", p >= 1);
  $("#goal-text").textContent = p >= 1 ? "✓" : S.day.seen;
  const st = streakNow();
  $("#streak-count").textContent = st;
  $("#streak-btn").classList.toggle("off", S.streak.last !== dateKey());
}

/* ---------- Abzeichen ---------- */
const nSeen = () => Object.keys(S.seen).length;
const catCorrect = c => Object.entries(S.ans).reduce((n, [id, a]) => n + (BY_ID.get(id)?.cat === c ? a.r : 0), 0);
const catSeen = c => Object.keys(S.seen).filter(id => BY_ID.get(id)?.cat === c).length;
const BADGES = [
  { id: "first", e: "🌱", n: "Erster Swipe", d: "Die erste Slide angesehen", t: () => nSeen() >= 1 },
  { id: "s100", e: "📚", n: "Vielleser", d: "100 Slides angesehen", t: () => nSeen() >= 100 },
  { id: "s500", e: "🧠", n: "Wissensdurst", d: "500 Slides angesehen", t: () => nSeen() >= 500 },
  { id: "s1000", e: "🏆", n: "Tausendsassa", d: "1000 Slides angesehen", t: () => nSeen() >= 1000 },
  { id: "c5", e: "🔥", n: "Heiße Serie", d: "5 richtige Antworten in Folge", t: () => S.bestCombo >= 5 },
  { id: "c15", e: "⚡", n: "Unaufhaltsam", d: "15 richtige Antworten in Folge", t: () => S.bestCombo >= 15 },
  { id: "c30", e: "🚀", n: "Überflieger", d: "30 richtige Antworten in Folge", t: () => S.bestCombo >= 30 },
  { id: "st3", e: "📅", n: "Dranbleiber", d: "3 Tage Lernserie", t: () => S.streak.count >= 3 },
  { id: "st7", e: "🗓️", n: "Wochenheld", d: "7 Tage Lernserie", t: () => S.streak.count >= 7 },
  { id: "st30", e: "👑", n: "Gewohnheit", d: "30 Tage Lernserie", t: () => S.streak.count >= 30 },
  { id: "sv10", e: "🔖", n: "Sammler", d: "10 Slides gespeichert", t: () => Object.keys(S.saved).length >= 10 },
  { id: "rv10", e: "🔁", n: "Gefestigt", d: "10 Wiederholungen gemeistert", t: () => S.mastered >= 10 },
  { id: "sp10", e: "⏱️", n: "Sprinter", d: "10 Punkte im Quiz-Sprint", t: () => S.best >= 10 },
  { id: "sp20", e: "🏎️", n: "Blitzdenker", d: "20 Punkte im Quiz-Sprint", t: () => S.best >= 20 },
  { id: "all", e: "🌍", n: "Allrounder", d: "In jeder Kategorie 25 Slides", t: () => CAT_KEYS.every(c => catSeen(c) >= 25) },
  { id: "pol", e: "🏛️", n: "Politikversteher", d: "50 richtige Antworten in Politik", t: () => catCorrect("politik") >= 50 },
  { id: "vwl", e: "📈", n: "Volkswirt", d: "50 richtige Antworten in VWL", t: () => catCorrect("vwl") >= 50 },
  { id: "ges", e: "🏺", n: "Historiker", d: "50 richtige Antworten in Geschichte", t: () => catCorrect("geschichte") >= 50 },
  { id: "bwl", e: "💼", n: "Betriebswirt", d: "50 richtige Antworten in BWL", t: () => catCorrect("bwl") >= 50 },
  { id: "fin", e: "💶", n: "Finanzprofi", d: "50 richtige Antworten in Finanzen", t: () => catCorrect("finanzen") >= 50 },
];
function checkBadges() {
  for (const b of BADGES) {
    if (!S.badges[b.id] && b.t()) {
      S.badges[b.id] = Date.now(); save();
      setTimeout(() => { toast(`🏅 Abzeichen: ${b.e} ${b.n}`); confetti(); }, 400);
    }
  }
}

/* ---------- Toast & Konfetti ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = $("#confetti"), ctx = cv.getContext("2d");
  const W = cv.width = cv.clientWidth * devicePixelRatio, H = cv.height = cv.clientHeight * devicePixelRatio;
  const cols = ["#4f6bff", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6", "#06b6d4"];
  const ps = Array.from({ length: 110 }, () => ({
    x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 16 * devicePixelRatio,
    vy: (-Math.random() * 15 - 5) * devicePixelRatio, s: (4 + Math.random() * 6) * devicePixelRatio,
    c: cols[Math.random() * cols.length | 0], r: Math.random() * 6, vr: (Math.random() - .5) * .4,
  }));
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.vy += .45 * devicePixelRatio; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - f / 110); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    if (++f < 110) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
  })();
}

/* ============================================================
   Karten-Rendering
   ============================================================ */
const ICON = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
};

function parseYear(y) {
  const m = String(y).match(/(\d{1,4})/);
  if (!m) return null;
  let n = +m[1];
  if (/v\.\s*Chr/i.test(y)) n = -n;
  return n;
}
function yearPos(y) {
  const pts = [[-3500, 0], [0, .22], [1000, .4], [1500, .56], [1800, .72], [1900, .82], [2030, 1]];
  if (y <= pts[0][0]) return 0;
  for (let i = 1; i < pts.length; i++) {
    const [y0, p0] = pts[i - 1], [y1, p1] = pts[i];
    if (y <= y1) return p0 + (p1 - p0) * (y - y0) / (y1 - y0);
  }
  return 1;
}
function timelineHtml(year) {
  const y = parseYear(year);
  if (y === null) return "";
  const ticks = [[-3000, "−3000"], [0, "0"], [1000, "1000"], [1500, "1500"], [1800, "1800"], [1900, "1900"], [2026, "heute"]];
  return `<div class="timeline" aria-hidden="true"><div class="axis"></div>${ticks.map(([t, l]) =>
    `<span class="tick" style="left:${(yearPos(t) * 100).toFixed(1)}%">${l}</span>`).join("")}
    <span class="dot" style="left:${(yearPos(y) * 100).toFixed(1)}%"></span></div>`;
}

function hasMore(s) { return !!(s.more || s.explain || (s.type === "whatif" && s.text)); }

function cardBody(s) {
  const more = s.more ? `<button class="more-btn" data-act="more">💡 Verstehen</button>` : "";
  switch (s.type) {
    case "fact":
      return `<h2 class="title">${fmt(s.title)}</h2><p class="text">${fmt(s.text)}</p>${more}`;
    case "event":
      return `<div class="year">${esc(s.year)}</div>${timelineHtml(s.year)}<h2 class="title">${fmt(s.title)}</h2><p class="text">${fmt(s.text)}</p>${more}`;
    case "number":
      return `<div class="number" data-value="${esc(s.value)}">${esc(s.value)}</div><p class="number-label">${fmt(s.label)}</p><p class="text">${fmt(s.text)}</p>${more}`;
    case "flashcard":
      return `<div class="flip" data-act="flip"><div class="flip-in">
          <div class="face front"><small>Was bedeutet …</small><div class="term">${fmt(s.term)}</div><small>Antippen zum Umdrehen ↻</small></div>
          <div class="face back"><div>${fmt(s.def)}</div>${s.example ? `<div class="ex">💬 ${fmt(s.example)}</div>` : ""}</div>
        </div></div><div class="rate-slot"></div>`;
    case "quiz": {
      const opts = shuffle(s.options.map((o, i) => ({ o, i })));
      return `<p class="q">${fmt(s.q)}</p><div class="options">${opts.map((x, k) =>
        `<button class="opt" data-act="opt" data-i="${x.i}"><span class="k">${"ABCD"[k]}</span><span>${fmt(x.o)}</span></button>`).join("")}</div>
        <div class="explain-slot"></div>`;
    }
    case "truefalse":
      return `<p class="q">${fmt(s.q)}</p><div class="tf">
        <button class="opt" data-act="tf" data-v="1">✓ Wahr</button><button class="opt" data-act="tf" data-v="0">✗ Falsch</button></div>
        <div class="explain-slot"></div>`;
    case "whatif":
      return `<p class="q">${fmt(s.q)}</p><p class="think">🤔 Überleg kurz selbst – dann deck die Wirkungskette auf.</p>
        <button class="btn accent" data-act="chain">Wirkungskette aufdecken ▶</button><div class="chain"></div>`;
    case "order": {
      let items = s.items.map((t, i) => ({ t, i }));
      do { items = shuffle(items); } while (items.length > 1 && items.every((x, k) => x.i === k));
      return `<p class="q">${fmt(s.q)}</p><p class="think">Tippe die Einträge in der richtigen Reihenfolge an.</p>
        <div class="order-items">${items.map(x => `<button class="opt" data-act="pick" data-i="${x.i}"><span class="k">·</span><span>${fmt(x.t)}</span></button>`).join("")}</div>
        <div class="explain-slot"></div>`;
    }
  }
  return "";
}

function renderCard(s, opts = {}) {
  const c = CATS[s.cat];
  const lvl = `<span class="lvl" title="${LEVEL_NAMES[s.level - 1]}">${[1, 2, 3].map(i => `<i class="${i <= s.level ? "f" : ""}"></i>`).join("")}</span>`;
  const compact = ["quiz", "order", "flashcard"].includes(s.type) || (s.type === "truefalse" && s.q.length > 110);
  const el = h(`<article class="card cat-${s.cat} t-${s.type}${compact ? " compact" : ""}" data-id="${s.id}">
    <div class="deco d1"></div><div class="deco d2"></div>
    <div class="card-inner">
      <div class="meta"><span class="pill">${c.icon} ${c.name} · ${esc(s.topic)}</span>
        <span class="kind${opts.review ? " review" : ""}">${opts.review ? "🔁 Wiederholung" : TYPE_LABEL[s.type]} ${lvl}</span></div>
      <div class="visual">${s.emoji || c.icon}</div>
      ${cardBody(s)}
    </div>
    <aside class="rail">
      <button class="like${S.liked[s.id] ? " on" : ""}" data-act="like"><span class="ic">${ICON.heart}</span>Gefällt</button>
      <button class="save${S.saved[s.id] ? " on" : ""}" data-act="save"><span class="ic">${ICON.save}</span>Merken</button>
      <button class="bulb${hasMore(s) && !INTERACTIVE.includes(s.type) ? "" : " dis"}" data-act="more"><span class="ic">${ICON.bulb}</span>Verstehen</button>
      <button data-act="share"><span class="ic">${ICON.share}</span>Teilen</button>
    </aside>
    ${opts.hint ? `<div class="swipe-hint">↑ Nach oben wischen</div>` : ""}
  </article>`);
  el._slide = s;
  return el;
}

/* ---------- Interaktionen auf Karten ---------- */
function onCardClick(e) {
  const card = e.target.closest(".card");
  if (!card) return;
  const s = card._slide, btn = e.target.closest("[data-act]");
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === "like") toggleLike(card, s);
  else if (act === "save") toggleSave(card, s);
  else if (act === "more") { if (!btn.classList.contains("dis") || card.classList.contains("answered")) openMore(s); }
  else if (act === "share") share(s);
  else if (act === "opt") answerQuiz(card, s, btn);
  else if (act === "tf") answerTf(card, s, btn);
  else if (act === "flip") flip(card, s, btn);
  else if (act === "chain") revealChain(card, s, btn);
  else if (act === "pick") pickOrder(card, s, btn);
  else if (act === "rate") rateFlash(card, s, btn.dataset.v === "1", btn);
}

function finishInteractive(card) {
  card.classList.add("answered");
  const b = $(".rail .bulb", card); if (b) b.classList.remove("dis");
}
function explainHtml(ok, text, prefix = "") {
  return `<div class="explain"><span class="verdict ${ok ? "ok" : "no"}">${ok ? "✓ Richtig!" : "✗ Leider falsch."}</span>${prefix}${fmt(text)}</div>`;
}
function answerQuiz(card, s, btn) {
  if (card.classList.contains("answered")) return;
  const ok = +btn.dataset.i === s.answer;
  $$(".opt", card).forEach(o => {
    if (+o.dataset.i === s.answer) o.classList.add("right");
    else if (o === btn) o.classList.add("wrong"); else o.classList.add("dim");
  });
  $(".explain-slot", card).innerHTML = explainHtml(ok, s.explain);
  finishInteractive(card); recordAnswer(s, ok, btn);
}
function answerTf(card, s, btn) {
  if (card.classList.contains("answered")) return;
  const v = btn.dataset.v === "1", ok = v === s.answer;
  $$(".opt", card).forEach(o => {
    const ov = o.dataset.v === "1";
    if (ov === s.answer) o.classList.add("right"); else if (o === btn) o.classList.add("wrong"); else o.classList.add("dim");
  });
  $(".explain-slot", card).innerHTML = explainHtml(ok, s.explain, `<b>Die Aussage ist ${s.answer ? "wahr" : "falsch"}.</b> `);
  finishInteractive(card); recordAnswer(s, ok, btn);
}
function flip(card, s, el) {
  el.classList.toggle("on");
  if (!card.classList.contains("flipped")) {
    card.classList.add("flipped");
    $(".rate-slot", card).innerHTML = `<div class="rate"><button class="btn no" data-act="rate" data-v="0">🔁 Nochmal</button>
      <button class="btn ok" data-act="rate" data-v="1">✅ Wusste ich</button></div>`;
  }
}
function rateFlash(card, s, ok, btn) {
  if (card.classList.contains("answered")) return;
  finishInteractive(card);
  $(".rate-slot", card).innerHTML = `<div class="explain"><span class="verdict ${ok ? "ok" : "no"}">${ok ? "Stark! 💪" : "Kommt bald wieder 🔁"}</span>${ok ? "Weiter so." : "Diese Karte landet in deiner Wiederholung."}</div>`;
  if (ok) {
    S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo);
    addXp(5, btn);
    const rv = S.review[s.id];
    if (rv) { rv.box++; if (rv.box >= REVIEW_DAYS.length) { delete S.review[s.id]; S.mastered++; } else rv.due = Date.now() + REVIEW_DAYS[rv.box] * DAY; }
    save(); checkBadges();
  } else {
    S.review[s.id] = { box: 0, due: Date.now() + 10 * 60e3 }; save();
  }
}
function revealChain(card, s, btn) {
  btn.remove();
  $(".think", card)?.remove();
  card.classList.add("answered");
  const ch = $(".chain", card);
  let html = "", d = 0;
  s.steps.forEach((st, i) => {
    if (i) { html += `<div class="arrow" style="animation-delay:${d}ms">▼</div>`; d += 120; }
    html += `<div class="step" style="animation-delay:${d}ms">${fmt(st)}</div>`; d += 330;
  });
  html += `<div class="explain" style="opacity:0;animation:appear .4s ease-out ${d}ms forwards">${fmt(s.text)}</div>`;
  ch.innerHTML = html;
  const inner = $(".card-inner", card);
  setTimeout(() => inner.scrollTo({ top: Math.max(0, $(".q", card).offsetTop - 70), behavior: "smooth" }), 50);
  $(".rail .bulb", card).classList.remove("dis");
  addXp(3, ch);
}
function pickOrder(card, s, btn) {
  if (card.classList.contains("answered") || btn.classList.contains("picked")) return;
  const picked = $$(".opt.picked", card).length;
  btn.classList.add("picked"); btn.dataset.pos = picked; $(".k", btn).textContent = picked + 1;
  if (picked + 1 < s.items.length) return;
  const opts = $$(".order-items .opt", card);
  const ok = opts.every(o => +o.dataset.pos === +o.dataset.i);
  opts.forEach(o => {
    o.classList.add(+o.dataset.pos === +o.dataset.i ? "right" : "wrong");
    $(".k", o).textContent = +o.dataset.i + 1;
  });
  // richtige Reihenfolge anzeigen
  const list = $(".order-items", card);
  opts.sort((a, b) => a.dataset.i - b.dataset.i).forEach(o => list.appendChild(o));
  $(".explain-slot", card).innerHTML = explainHtml(ok, s.explain, ok ? "" : "So ist es richtig (siehe oben). ");
  finishInteractive(card); recordAnswer(s, ok, btn);
}

function toggleLike(card, s, force) {
  const b = $(".rail .like", card);
  const on = force ?? !S.liked[s.id];
  if (on) S.liked[s.id] = Date.now(); else delete S.liked[s.id];
  b.classList.toggle("on", on); save();
  if (on) vibrate(10);
}
function toggleSave(card, s) {
  const b = $(".rail .save", card);
  const on = !S.saved[s.id];
  if (on) S.saved[s.id] = Date.now(); else delete S.saved[s.id];
  b.classList.toggle("on", on); save();
  toast(on ? "🔖 In deiner Sammlung gespeichert" : "Aus der Sammlung entfernt");
  checkBadges();
}
async function share(s) {
  const text = shareText(s);
  try {
    if (navigator.share) await navigator.share({ title: "Wissensfeed", text });
    else { await navigator.clipboard.writeText(text); toast("📋 In die Zwischenablage kopiert"); }
  } catch (e) { /* abgebrochen */ }
}
function shareText(s) {
  switch (s.type) {
    case "quiz": return `${plain(s.q)}\n${s.options.map((o, i) => `${"ABCD"[i]}) ${plain(o)}`).join("\n")}\n\n(Wissensfeed)`;
    case "truefalse": return `Wahr oder falsch? ${plain(s.q)}\n\n(Wissensfeed)`;
    case "flashcard": return `${plain(s.term)}: ${plain(s.def)}\n\n(Wissensfeed)`;
    case "number": return `${s.value} – ${plain(s.label)}\n${plain(s.text)}\n\n(Wissensfeed)`;
    case "event": return `${s.year}: ${plain(s.title)}\n${plain(s.text)}\n\n(Wissensfeed)`;
    case "whatif": return `${plain(s.q)}\n${s.steps.map(plain).join(" → ")}\n\n(Wissensfeed)`;
    case "order": return `${plain(s.q)}\n${s.items.map((t, i) => `${i + 1}. ${plain(t)}`).join("\n")}\n\n(Wissensfeed)`;
    default: return `${plain(s.title)}\n${plain(s.text)}\n\n(Wissensfeed)`;
  }
}

/* ---------- „Verstehen“-Sheet ---------- */
function openMore(s) {
  const c = CATS[s.cat];
  let body = "";
  if (s.more) body += `<div class="label">Warum das wichtig ist</div><p>${fmt(s.more)}</p>`;
  if (s.explain && s.type !== "quiz" && s.type !== "truefalse" && s.type !== "order") body += `<p>${fmt(s.explain)}</p>`;
  if ((s.type === "quiz" || s.type === "truefalse" || s.type === "order") && s.explain) body += `<div class="label">Erklärung</div><p>${fmt(s.explain)}</p>`;
  if (s.type === "whatif") body += `<div class="label">Wirkungskette</div><p>${s.steps.map(fmt).join(" → ")}</p><p>${fmt(s.text)}</p>`;
  const sameTopic = SLIDES.filter(x => x.topic === s.topic && x.cat === s.cat).length;
  $("#sheet-body").innerHTML = `<div class="cat-${s.cat}" style="display:contents">
    <div class="meta" style="margin-bottom:8px"><span class="pill">${c.icon} ${c.name} · ${esc(s.topic)}</span></div>
    <h3>${fmt(titleOf(s))}</h3>${body}
    <div class="acts">
      ${sameTopic > 1 ? `<button class="btn accent" id="sheet-topic">Mehr zu „${esc(s.topic)}“ (${sameTopic}) →</button>` : ""}
      <button class="btn" id="sheet-save">${S.saved[s.id] ? "🔖 Gespeichert" : "🔖 In Sammlung speichern"}</button>
    </div></div>`;
  $("#sheet-topic")?.addEventListener("click", () => { closeSheet(); openFeed({ cat: s.cat, topic: s.topic, label: s.topic }); });
  $("#sheet-save").addEventListener("click", () => {
    const card = $(`.card[data-id="${s.id}"]`);
    if (card) toggleSave(card, s); else { S.saved[s.id] = Date.now(); save(); toast("🔖 Gespeichert"); }
    closeSheet();
  });
  $("#sheet-back").hidden = false;
  requestAnimationFrame(() => $("#sheet").classList.add("open"));
}
function closeSheet() { $("#sheet").classList.remove("open"); $("#sheet-back").hidden = true; }

/* ============================================================
   Feed
   ============================================================ */
const feedEl = $("#feed");
let feed = { ctx: { label: "Für dich" }, src: null, count: 0, sinceReview: 0 };

function poolFor(ctx) {
  return SLIDES.filter(s =>
    (!ctx.cat || s.cat === ctx.cat) && (!ctx.topic || s.topic === ctx.topic) &&
    (!ctx.types || ctx.types.includes(s.type)) &&
    (ctx.topic || S.levels.includes(s.level)));
}
function makeSource(ctx) {
  const pool = poolFor(ctx);
  const byCat = {};
  for (const s of pool) (byCat[s.cat] ||= []).push(s);
  const decks = {};
  const fill = c => {
    const all = byCat[c] || [];
    decks[c] = [...shuffle(all.filter(s => !S.seen[s.id])), ...shuffle(all.filter(s => S.seen[s.id]))];
  };
  Object.keys(byCat).forEach(fill);
  const recent = [];
  return {
    size: pool.length,
    next() {
      const cats = Object.keys(byCat);
      if (!cats.length) return null;
      const w = cats.map(c => {
        let x = ctx.cat ? 1 : (S.interests.includes(c) ? 1 : .2);
        const likes = Object.keys(S.liked).filter(id => BY_ID.get(id)?.cat === c).length;
        return x * (1 + Math.min(.5, likes * .02));
      });
      let r = Math.random() * w.reduce((a, b) => a + b, 0), c = cats[0];
      for (let i = 0; i < cats.length; i++) { r -= w[i]; if (r <= 0) { c = cats[i]; break; } }
      if (!decks[c].length) fill(c);
      const d = decks[c];
      let k = d.findIndex((s, i) => i < 12 && !recent.includes(s.topic));
      if (k < 0) k = 0;
      const s = d.splice(k, 1)[0];
      recent.push(s.topic); if (recent.length > 2) recent.shift();
      return s;
    },
  };
}

function openFeed(ctx = {}) {
  feed = { ctx: { label: "Für dich", ...ctx }, src: null, count: 0, sinceReview: 0 };
  feedEl.innerHTML = "";
  if (ctx.ids) {
    ctx.ids.forEach((id, i) => { const s = BY_ID.get(id); if (s) feedEl.appendChild(renderCard(s, { review: ctx.review })); });
    feed.count = ctx.ids.length;
    feedEl.appendChild(h(`<div class="feed-end"><div><div style="font-size:48px">✨</div><p class="lead">Das war’s in dieser Liste.</p>
      <button class="btn primary" data-home>Zurück zu „Für dich“</button></div></div>`));
    observeAll();
    showView("feed");
    const target = feedEl.children[ctx.start || 0];
    requestAnimationFrame(() => { feedEl.scrollTop = target ? target.offsetTop : 0; });
  } else {
    feed.src = makeSource(feed.ctx);
    if (!feed.src.size) {
      feedEl.innerHTML = `<div class="feed-end"><div><div style="font-size:48px">🔍</div><p class="lead">Hier gibt es (noch) keine Slides.</p>
        <button class="btn primary" data-home>Zurück zu „Für dich“</button></div></div>`;
    } else appendCards(6);
    showView("feed");
    feedEl.scrollTop = 0;
  }
  renderChips();
}
function appendCards(n) {
  for (let i = 0; i < n; i++) {
    let s, review = false;
    if (!feed.ctx.cat && !feed.ctx.topic && !feed.ctx.types && feed.sinceReview >= 6) {
      const shown = new Set($$(".card", feedEl).slice(-30).map(c => c.dataset.id));
      const due = dueReviews().filter(id => !shown.has(id));
      if (due.length) { s = BY_ID.get(due[Math.random() * due.length | 0]); review = true; feed.sinceReview = 0; }
    }
    if (!s) { s = feed.src.next(); feed.sinceReview++; }
    if (!s) return;
    feedEl.appendChild(renderCard(s, { review, hint: feed.count === 0 && nSeen() < 3 }));
    feed.count++;
  }
  observeAll();
}

let seenObs, moreObs;
function observeAll() {
  seenObs ||= new IntersectionObserver(entries => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const card = en.target, s = card._slide;
      if (!s) continue;
      markSeen(s);
      const num = $(".number", card);
      if (num && !num.dataset.done) { num.dataset.done = 1; countUp(num); }
    }
  }, { root: feedEl, threshold: .6 });
  moreObs ||= new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting && feed.src) {
      const cards = $$(".card", feedEl);
      if (cards.indexOf(en.target) >= cards.length - 3) appendCards(6);
    }
  }, { root: feedEl, threshold: .1 });
  $$(".card:not([data-obs])", feedEl).forEach(c => { c.dataset.obs = 1; seenObs.observe(c); moreObs.observe(c); });
}

function countUp(el) {
  const raw = el.dataset.value;
  const m = raw.match(/^([^\d−-]*)([−-]?[\d.]+(?:,\d+)?)(.*)$/);
  if (!m) return;
  const n = m[2].replace("−", "-");
  let val, dec = 0, grouping = false;
  if (n.includes(",")) { dec = n.split(",")[1].length; grouping = n.includes("."); val = parseFloat(n.replace(/\./g, "").replace(",", ".")); }
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(n)) { grouping = true; val = parseFloat(n.replace(/\./g, "")); }
  else if (n.includes(".")) return;
  else val = parseFloat(n);
  if (!isFinite(val)) return;
  const f = new Intl.NumberFormat("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: grouping });
  const t0 = performance.now(), dur = 900;
  (function step(t) {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = p < 1 ? m[1] + f.format(val * e) + m[3] : raw;
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

/* Doppeltippen = Gefällt mir */
let lastTap = 0;
feedEl.addEventListener("click", e => {
  onCardClick(e);
  const card = e.target.closest(".card");
  if (!card || e.target.closest("button, [data-act]")) return;
  const now = Date.now();
  if (now - lastTap < 320) {
    toggleLike(card, card._slide, true);
    const r = card.getBoundingClientRect();
    const heart = h(`<div class="big-heart">❤️</div>`);
    heart.style.left = (e.clientX - r.left) + "px"; heart.style.top = (e.clientY - r.top) + "px";
    card.appendChild(heart); setTimeout(() => heart.remove(), 800);
    lastTap = 0;
  } else lastTap = now;
});
feedEl.addEventListener("click", e => { if (e.target.closest("[data-home]")) goBack(); });
function goBack() {
  const v = feed.ctx.backView;
  openFeed();
  if (v) showView(v);
}

function renderChips() {
  const ctx = feed.ctx, el = $("#feed-chips");
  const special = ctx.topic || ctx.types || ctx.ids;
  if (special) {
    el.innerHTML = `<button class="chip back" data-home>‹ ${esc(ctx.label || "Zurück")}</button>`;
  } else {
    el.innerHTML = `<button class="chip${!ctx.cat ? " on" : ""}" data-cat="">Für dich</button>` +
      CAT_KEYS.map(c => `<button class="chip${ctx.cat === c ? " on" : ""}" data-cat="${c}">${CATS[c].icon} ${CATS[c].name}</button>`).join("");
  }
}
$("#feed-chips").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.hasAttribute("data-home")) return goBack();
  const c = b.dataset.cat;
  openFeed(c ? { cat: c, label: CATS[c].name } : {});
  b.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
});

/* ============================================================
   Navigation
   ============================================================ */
let currentView = "feed";
function showView(v) {
  if (v !== "sprint" && sprint.running) endSprint(true);
  currentView = v;
  $$(".view").forEach(x => x.hidden = x.id !== "view-" + v);
  $$("#tabbar button").forEach(b => b.classList.toggle("on", b.dataset.view === v));
  if (v === "explore") renderExplore();
  if (v === "saved") renderSaved();
  if (v === "profile") renderProfile();
  if (v === "sprint" && !sprint.running) renderSprintStart();
  if (v === "feed") updateBar();
}
$("#tabbar").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.view === "feed" && currentView === "feed" && !feed.ctx.ids && !feed.ctx.topic && !feed.ctx.types) {
    feedEl.scrollTo({ top: 0, behavior: "smooth" });
  }
  showView(b.dataset.view);
});
$("#sheet-back").addEventListener("click", closeSheet);
let sheetY = null;
$("#sheet").addEventListener("touchstart", e => { sheetY = $("#sheet").scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
$("#sheet").addEventListener("touchend", e => { if (sheetY !== null && e.changedTouches[0].clientY - sheetY > 70) closeSheet(); sheetY = null; });
$("#streak-btn").addEventListener("click", () => {
  const st = streakNow();
  toast(st ? `🔥 ${st} ${st === 1 ? "Tag" : "Tage"} Lernserie – erreiche heute dein Tagesziel, um sie zu halten.` : "🔥 Erreiche dein Tagesziel, um eine Lernserie zu starten.");
});
$("#goal-ring").addEventListener("click", () => { ensureDay(); toast(`🎯 Heute: ${S.day.seen} / ${S.goal} Slides · ${S.day.correct} richtige Antworten`); });

/* ============================================================
   Entdecken
   ============================================================ */
const MODES = [
  { e: "🧠", n: "Nur Quiz", d: "Multiple Choice & Wahr/Falsch", types: ["quiz", "truefalse"] },
  { e: "🃏", n: "Lernkarten", d: "Begriffe sicher draufhaben", types: ["flashcard"] },
  { e: "🔮", n: "Was passiert, wenn …?", d: "Wirkungsketten verstehen", types: ["whatif"] },
  { e: "⏳", n: "Zeitreise", d: "Ereignisse & Zeitstrahl", types: ["event", "order"] },
  { e: "🔢", n: "Zahlen, die zählen", d: "Fakten zum Mitreden", types: ["number"] },
  { e: "🔁", n: "Wiederholen", d: "Deine fälligen Fehler", review: true },
];
function renderExplore() {
  $("#modes").innerHTML = MODES.map((m, i) => {
    const n = m.review ? dueReviews().length : SLIDES.filter(s => m.types.includes(s.type)).length;
    return `<button class="mode" data-m="${i}"><span class="e">${m.e}</span><b>${m.n}</b><small>${m.d} · ${n}</small></button>`;
  }).join("");
  $("#cat-list").innerHTML = CAT_KEYS.map(c => {
    const all = SLIDES.filter(s => s.cat === c), seen = all.filter(s => S.seen[s.id]).length;
    const topics = {};
    for (const s of all) (topics[s.topic] ||= []).push(s);
    const tl = Object.entries(topics).sort((a, b) => b[1].length - a[1].length);
    const pct = all.length ? Math.round(seen / all.length * 100) : 0;
    return `<div class="catcard cat-${c}"><button class="cat-head" data-open>
        <span class="e">${CATS[c].icon}</span>
        <span class="info"><b>${CATS[c].name}</b><small>${all.length} Slides · ${tl.length} Themen · ${pct} % gesehen</small>
        <div class="bar"><i style="width:${pct}%"></i></div></span><span class="chev">›</span></button>
      <div class="topics"><button class="btn accent all" data-cat="${c}">Alle ${CATS[c].name}-Slides ansehen</button>
        ${tl.map(([t, l]) => { const sn = l.filter(s => S.seen[s.id]).length; return `<button class="topic" data-cat="${c}" data-topic="${esc(t)}">
          <span>${esc(t)}</span><span class="${sn === l.length ? "done" : ""}">${sn}/${l.length}${sn === l.length ? " ✓" : ""}</span></button>`; }).join("")}
      </div></div>`;
  }).join("");
}
$("#modes").addEventListener("click", e => {
  const b = e.target.closest(".mode"); if (!b) return;
  const m = MODES[b.dataset.m];
  if (m.review) {
    const ids = shuffle(dueReviews());
    if (!ids.length) return toast("🎉 Nichts fällig – du bist auf dem neuesten Stand!");
    openFeed({ ids, review: true, label: "Wiederholen", backView: "explore" });
  } else openFeed({ types: m.types, label: m.n, backView: "explore" });
});
$("#cat-list").addEventListener("click", e => {
  const head = e.target.closest("[data-open]");
  if (head) return head.parentElement.classList.toggle("open");
  const b = e.target.closest("[data-cat]"); if (!b) return;
  if (b.dataset.topic) openFeed({ cat: b.dataset.cat, topic: b.dataset.topic, label: b.dataset.topic, backView: "explore" });
  else openFeed({ cat: b.dataset.cat, label: CATS[b.dataset.cat].name });
});
const norm = s => plain(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const searchIndex = SLIDES.map(s => norm([s.topic, s.title, s.text, s.q, s.term, s.def, s.label, s.year, s.value, ...(s.options || []), ...(s.steps || []), ...(s.items || [])].filter(Boolean).join(" ")));
let searchHits = [];
$("#search").addEventListener("input", e => {
  const q = norm(e.target.value.trim());
  const res = $("#search-results");
  $("#explore-main").hidden = !!q; res.hidden = !q;
  if (!q) return;
  const words = q.split(/\s+/);
  searchHits = SLIDES.filter((s, i) => words.every(w => searchIndex[i].includes(w)));
  res.innerHTML = searchHits.length ? `<div class="lead">${searchHits.length} Treffer</div>` + searchHits.slice(0, 60).map((s, i) =>
    `<button class="result cat-${s.cat}" data-i="${i}"><span class="e">${s.emoji}</span><span><div class="t">${esc(titleOf(s))}</div>
      <div class="s">${CATS[s.cat].name} · ${esc(s.topic)} · ${TYPE_LABEL[s.type]}</div></span></button>`).join("")
    : `<div class="empty">Keine Treffer. Versuch’s mit einem anderen Begriff.</div>`;
});
$("#search-results").addEventListener("click", e => {
  const b = e.target.closest(".result"); if (!b) return;
  openFeed({ ids: searchHits.slice(0, 60).map(s => s.id), start: +b.dataset.i, label: "Suche", backView: "explore" });
});

/* ============================================================
   Sammlung (Gespeichert / Gefällt mir / Wiederholen)
   ============================================================ */
let savedTab = "saved", savedCat = "";
function savedIds() {
  let ids;
  if (savedTab === "review") ids = Object.entries(S.review).sort((a, b) => a[1].due - b[1].due).map(x => x[0]);
  else ids = Object.entries(S[savedTab]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  return ids.filter(id => BY_ID.has(id) && (!savedCat || BY_ID.get(id).cat === savedCat));
}
function renderSaved() {
  $$("#saved-seg button").forEach(b => {
    b.classList.toggle("on", b.dataset.k === savedTab);
    const n = b.dataset.k === "review" ? Object.keys(S.review).length : Object.keys(S[b.dataset.k]).length;
    b.textContent = { saved: "🔖 Gemerkt", liked: "♥ Likes", review: "🔁 Wiederholen" }[b.dataset.k] + (n ? ` · ${n}` : "");
  });
  $("#saved-cats").innerHTML = `<button class="${!savedCat ? "on" : ""}" data-c="">Alle</button>` +
    CAT_KEYS.map(c => `<button class="${savedCat === c ? "on" : ""}" data-c="${c}">${CATS[c].icon} ${CATS[c].name}</button>`).join("");
  const ids = savedIds();
  const now = Date.now();
  $("#saved-grid").innerHTML = ids.length ? ids.map((id, i) => {
    const s = BY_ID.get(id);
    const due = savedTab === "review" ? (S.review[id].due <= now ? "fällig" : "in " + Math.max(1, Math.ceil((S.review[id].due - now) / DAY)) + " T.") : TYPE_LABEL[s.type].replace(" …?", "").replace(" oder falsch?", "/Falsch");
    return `<button class="thumb cat-${s.cat}" data-i="${i}"><span class="e">${s.emoji}</span><span class="ty">${due}</span><span class="t">${esc(titleOf(s))}</span></button>`;
  }).join("") : `<div class="empty" style="grid-column:1/-1">${{
    saved: "Noch nichts gespeichert.<br>Tippe im Feed auf 🔖 <b>Merken</b>, um wichtige Slides hier zu sammeln.",
    liked: "Noch keine Likes.<br>Doppeltippen oder ♥ im Feed.",
    review: "Keine offenen Wiederholungen. 🎉<br>Falsch beantwortete Fragen landen automatisch hier und kommen in klugen Abständen wieder.",
  }[savedTab]}</div>`;
}
$("#saved-seg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; savedTab = b.dataset.k; renderSaved(); });
$("#saved-cats").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; savedCat = b.dataset.c; renderSaved(); });
$("#saved-grid").addEventListener("click", e => {
  const b = e.target.closest(".thumb"); if (!b) return;
  openFeed({ ids: savedIds(), start: +b.dataset.i, review: savedTab === "review", label: { saved: "Gespeichert", liked: "Gefällt mir", review: "Wiederholen" }[savedTab], backView: "saved" });
});

/* ============================================================
   Quiz-Sprint
   ============================================================ */
const sprint = { running: false };
function renderSprintStart() {
  $("#sprint-start").hidden = false; $("#sprint-game").hidden = true; $("#sprint-end").hidden = true;
  $("#sprint-best").textContent = S.best;
  $("#sprint-cats").innerHTML = CAT_KEYS.map(c => `<button class="${S.sprintCats.includes(c) ? "on" : ""}" data-c="${c}">${CATS[c].icon} ${CATS[c].name}</button>`).join("");
}
$("#sprint-cats").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const c = b.dataset.c, on = S.sprintCats.includes(c);
  if (on && S.sprintCats.length === 1) return toast("Mindestens eine Kategorie auswählen");
  S.sprintCats = on ? S.sprintCats.filter(x => x !== c) : [...S.sprintCats, c];
  save(); renderSprintStart();
});
$("#sprint-go").addEventListener("click", startSprint);
$("#sprint-quit").addEventListener("click", () => endSprint(true));
function startSprint() {
  const pool = shuffle(SLIDES.filter(s => (s.type === "quiz" || s.type === "truefalse") && S.sprintCats.includes(s.cat) && s.q.length < 170));
  Object.assign(sprint, { running: true, pool, i: 0, score: 0, time: 60, misses: [], lock: false, end: Date.now() + 60e3 });
  $("#sprint-start").hidden = true; $("#sprint-end").hidden = true; $("#sprint-game").hidden = false;
  $("#sprint-score").textContent = 0;
  nextSprintQ();
  clearInterval(sprint.timer);
  sprint.timer = setInterval(() => {
    const left = Math.max(0, sprint.end - Date.now());
    $("#sprint-bar").style.width = (left / 600) + "%";
    $("#sprint-bar").style.backgroundPosition = (100 - left / 600) + "% 0";
    if (!left) endSprint();
  }, 100);
}
function nextSprintQ() {
  if (sprint.i >= sprint.pool.length) { sprint.pool = shuffle(sprint.pool); sprint.i = 0; }
  const s = sprint.pool[sprint.i++]; sprint.cur = s; sprint.lock = false;
  const card = $("#sprint-card");
  card.className = `sprint-card cat-${s.cat}`;
  if (s.type === "quiz") {
    const opts = shuffle(s.options.map((o, i) => ({ o, i })));
    card.innerHTML = `<div class="meta"><span class="pill">${CATS[s.cat].icon} ${esc(s.topic)}</span></div><p class="q">${fmt(s.q)}</p>
      <div class="options">${opts.map((x, k) => `<button class="opt" data-i="${x.i}"><span class="k">${"ABCD"[k]}</span><span>${fmt(x.o)}</span></button>`).join("")}</div>`;
  } else {
    card.innerHTML = `<div class="meta"><span class="pill">${CATS[s.cat].icon} ${esc(s.topic)}</span><span class="kind">Wahr oder falsch?</span></div>
      <p class="q">${fmt(s.q)}</p><div class="tf"><button class="opt" data-v="1">✓ Wahr</button><button class="opt" data-v="0">✗ Falsch</button></div>`;
  }
}
$("#sprint-card").addEventListener("click", e => {
  const b = e.target.closest(".opt"); if (!b || sprint.lock || !sprint.running) return;
  sprint.lock = true;
  const s = sprint.cur;
  const ok = s.type === "quiz" ? +b.dataset.i === s.answer : (b.dataset.v === "1") === s.answer;
  $$("#sprint-card .opt").forEach(o => {
    const right = s.type === "quiz" ? +o.dataset.i === s.answer : (o.dataset.v === "1") === s.answer;
    if (right) o.classList.add("right"); else if (o === b) o.classList.add("wrong");
  });
  const card = $("#sprint-card");
  card.classList.add(ok ? "flash-ok" : "flash-no");
  const a = S.ans[s.id] || (S.ans[s.id] = { r: 0, w: 0 });
  if (ok) { sprint.score++; a.r++; vibrate(12); $("#sprint-score").textContent = sprint.score; }
  else { a.w++; sprint.end -= 5000; sprint.misses.push(s); S.review[s.id] = { box: 0, due: Date.now() + 10 * 60e3 }; vibrate([30, 40, 30]); }
  save();
  setTimeout(() => { if (sprint.running) nextSprintQ(); }, ok ? 450 : 1300);
});
function endSprint(aborted) {
  clearInterval(sprint.timer);
  if (!sprint.running) return;
  sprint.running = false;
  if (aborted) return renderSprintStart();
  const rec = sprint.score > S.best;
  if (rec) S.best = sprint.score;
  save();
  if (sprint.score) addXp(sprint.score * 3);
  checkBadges();
  if (rec && sprint.score >= 3) confetti();
  $("#sprint-game").hidden = true;
  const end = $("#sprint-end"); end.hidden = false;
  end.innerHTML = `<div class="end-score"><div class="n">${sprint.score}</div><div class="l">richtige Antworten · +${sprint.score * 3} XP</div>
      ${rec ? `<span class="new-record">🏆 Neuer Rekord!</span>` : `<div class="l">Rekord: ${S.best}</div>`}</div>
    <button class="btn primary big" id="sprint-again">Nochmal ⚡</button>
    ${sprint.misses.length ? `<h2 class="h2">Daraus lernst du (${sprint.misses.length}) – kommt in die Wiederholung</h2>` +
      sprint.misses.map(s => `<div class="miss"><b>${fmt(s.q)}</b>Richtig: <span>${s.type === "quiz" ? fmt(s.options[s.answer]) : s.answer ? "Wahr" : "Falsch"}</span><br>${fmt(s.explain)}</div>`).join("") : ""}`;
  $("#sprint-again").addEventListener("click", startSprint);
}

/* ============================================================
   Profil
   ============================================================ */
function renderProfile() {
  const L = levelInfo();
  const answered = Object.values(S.ans).reduce((a, x) => ({ r: a.r + x.r, w: a.w + x.w }), { r: 0, w: 0 });
  const acc = answered.r + answered.w ? Math.round(answered.r / (answered.r + answered.w) * 100) + " %" : "–";
  const got = BADGES.filter(b => S.badges[b.id]).length;
  $("#profile").innerHTML = `
    <div class="prof-head"><div class="avatar">🦉</div><div><div class="lv">Level ${L.lv}</div><div class="tt">${L.rank}</div></div></div>
    <div class="xpbar"><i style="width:${L.into / L.need * 100}%"></i></div>
    <div class="xpinfo"><span>${S.xp} XP gesamt</span><span>noch ${L.need - L.into} XP bis Level ${L.lv + 1}</span></div>
    <h2 class="h2">Statistik</h2>
    <div class="tiles">
      <div class="tile"><b>${nSeen()}</b><small>von ${SLIDES.length} Slides</small></div>
      <div class="tile"><b>${acc}</b><small>Quiz-Quote</small></div>
      <div class="tile"><b>${streakNow()} 🔥</b><small>Tage Serie</small></div>
      <div class="tile"><b>${S.bestCombo}</b><small>Beste Combo</small></div>
      <div class="tile"><b>${S.best}</b><small>Sprint-Rekord</small></div>
      <div class="tile"><b>${S.mastered}</b><small>Gefestigt</small></div>
    </div>
    <h2 class="h2">Kategorien</h2>
    ${CAT_KEYS.map(c => {
      const all = SLIDES.filter(s => s.cat === c).length, sn = catSeen(c);
      let r = 0, w = 0; for (const [id, a] of Object.entries(S.ans)) if (BY_ID.get(id)?.cat === c) { r += a.r; w += a.w; }
      return `<div class="catstat cat-${c}"><span class="e">${CATS[c].icon}</span><div class="info">
        <div class="top">${CATS[c].name}<span>${sn}/${all} · ${r + w ? Math.round(r / (r + w) * 100) + " % richtig" : "noch kein Quiz"}</span></div>
        <div class="bar"><i style="width:${all ? sn / all * 100 : 0}%"></i></div></div></div>`;
    }).join("")}
    <h2 class="h2">Abzeichen · ${got}/${BADGES.length}</h2>
    <div class="badges">${BADGES.map(b => `<button class="badge${S.badges[b.id] ? "" : " locked"}" data-b="${b.id}"><span class="e">${b.e}</span><small>${b.n}</small></button>`).join("")}</div>
    <h2 class="h2">Einstellungen</h2>
    <div class="setting"><b>Tagesziel</b><div class="toggle-chips" id="set-goal">${[10, 20, 30, 50].map(g => `<button class="${S.goal === g ? "on" : ""}" data-g="${g}">${g} Slides</button>`).join("")}</div></div>
    <div class="setting"><b>Interessen für „Für dich“</b><small>Abgewählte Kategorien erscheinen seltener.</small>
      <div class="toggle-chips" id="set-int">${CAT_KEYS.map(c => `<button class="${S.interests.includes(c) ? "on" : ""}" data-c="${c}">${CATS[c].icon} ${CATS[c].name}</button>`).join("")}</div></div>
    <div class="setting"><b>Niveau im Feed</b><small>Als BWL-Profi kannst du z. B. die Basis ausblenden.</small>
      <div class="toggle-chips" id="set-lvl">${[1, 2, 3].map(l => `<button class="${S.levels.includes(l) ? "on" : ""}" data-l="${l}">${"●".repeat(l)} ${LEVEL_NAMES[l - 1]}</button>`).join("")}</div></div>
    <button class="danger" id="reset">Fortschritt zurücksetzen</button>`;
}
$("#profile").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.b) { const x = BADGES.find(y => y.id === b.dataset.b); return toast(`${x.e} ${x.n}: ${x.d}${S.badges[x.id] ? " ✓" : ""}`); }
  if (b.dataset.g) { S.goal = +b.dataset.g; save(); updateBar(); }
  else if (b.dataset.c) {
    const c = b.dataset.c, on = S.interests.includes(c);
    if (on && S.interests.length === 1) return toast("Mindestens eine Kategorie behalten");
    S.interests = on ? S.interests.filter(x => x !== c) : [...S.interests, c]; save(); feed.stale = true;
  } else if (b.dataset.l) {
    const l = +b.dataset.l, on = S.levels.includes(l);
    if (on && S.levels.length === 1) return toast("Mindestens ein Niveau behalten");
    S.levels = on ? S.levels.filter(x => x !== l) : [...S.levels, l].sort(); save(); feed.stale = true;
  } else if (b.id === "reset") {
    if (!confirm("Wirklich den gesamten Fortschritt (XP, Sammlung, Statistik) löschen?")) return;
    S = defaults(); S.onboarded = true; save(); openFeed(); showView("profile");
    return toast("Zurückgesetzt");
  } else return;
  renderProfile();
});
// Nach Änderung von Interessen/Niveau den Feed beim nächsten Öffnen neu mischen
$("#tabbar").addEventListener("click", e => {
  if (e.target.closest("[data-view=feed]") && feed.stale) { feed.stale = false; openFeed(); }
});

/* ============================================================
   Onboarding
   ============================================================ */
function onboarding(step = 0) {
  const ov = $("#onboarding"); ov.hidden = false;
  const dots = `<div class="ob-dots">${[0, 1, 2].map(i => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</div>`;
  if (step === 0) {
    ov.innerHTML = `<div class="ob-hero">
      <div class="ob-emojis">${CAT_KEYS.map(c => `<span class="cat-${c}">${CATS[c].icon}</span>`).join("")}</div>
      <h1 class="ob-title">Dein täglicher<br><em>Wissensfeed.</em></h1>
      <ul class="ob-list">
        <li>👆 <b>Wischen statt pauken:</b> ${SLIDES.length} kurze Slides zu Politik, VWL, Geschichte, BWL und Finanzen.</li>
        <li>🧩 <b>Quiz, Lernkarten, Zeitstrahl</b> und „Was passiert, wenn …?“-Ketten.</li>
        <li>🔖 <b>Merken</b> wie bei TikTok – deine Sammlung bleibt.</li>
        <li>🔁 <b>Fehler kommen wieder</b>, bis sie sitzen. Mit XP, Serien und Abzeichen.</li>
      </ul></div>${dots}<button class="btn primary big" style="margin-top:0" id="ob-next">Weiter</button>`;
  } else if (step === 1) {
    ov.innerHTML = `<div class="ob-hero"><h1 class="ob-title">Was interessiert<br>dich am <em>meisten?</em></h1>
      <p class="lead">Dein „Für dich“-Feed mischt diese Themen stärker. Ändern kannst du das jederzeit im Profil.</p>
      <div class="toggle-chips" id="ob-int">${CAT_KEYS.map(c => `<button class="${S.interests.includes(c) ? "on" : ""}" data-c="${c}">${CATS[c].icon} ${CATS[c].name}</button>`).join("")}</div>
      </div>${dots}<button class="btn primary big" style="margin-top:0" id="ob-next">Weiter</button>`;
    $("#ob-int").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      const c = b.dataset.c, on = S.interests.includes(c);
      if (on && S.interests.length === 1) return;
      S.interests = on ? S.interests.filter(x => x !== c) : [...S.interests, c];
      b.classList.toggle("on", !on);
    });
  } else {
    ov.innerHTML = `<div class="ob-hero"><h1 class="ob-title">Dein <em>Tagesziel</em></h1>
      <p class="lead">Wie viele Slides pro Tag? Erreichst du dein Ziel, wächst deine 🔥 Lernserie.</p>
      <div class="goal-opts" id="ob-goal">${[[10, "Locker · ~3 Min."], [20, "Solide · ~6 Min."], [30, "Ehrgeizig · ~10 Min."], [50, "Wissensjunkie · ~15 Min."]]
        .map(([g, l]) => `<button class="${S.goal === g ? "on" : ""}" data-g="${g}"><b>${g}</b><small>${l}</small></button>`).join("")}</div>
      </div>${dots}<button class="btn primary big" style="margin-top:0" id="ob-next">Los geht’s 🚀</button>`;
    $("#ob-goal").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      S.goal = +b.dataset.g; $$("#ob-goal button").forEach(x => x.classList.toggle("on", x === b));
    });
  }
  $("#ob-next").addEventListener("click", () => {
    if (step < 2) return onboarding(step + 1);
    S.onboarded = true; save(); ov.hidden = true; openFeed();
  });
}

/* ============================================================
   Start
   ============================================================ */
ensureDay();
if (!S.onboarded) onboarding(); else openFeed();
updateBar();
document.addEventListener("visibilitychange", () => { if (!document.hidden) { ensureDay(); updateBar(); } });
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
