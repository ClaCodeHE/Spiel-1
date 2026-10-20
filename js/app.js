(() => {
  "use strict";

  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 20;
  const TIME_STEP = 30;
  const MIN_TIME = 30;
  const MAX_TIME = 30 * 60;
  const RING_LENGTH = 2 * Math.PI * 88;
  const STORAGE_KEY = "imposter.settings.v1";
  const USED_KEY = "imposter.used.v1";

  // Reihenfolge der Kategorien wie gewünscht
  const CATEGORY_ORDER = ["sport", "alltag", "geografie", "natur", "chemie", "witzig", "filme", "tiere", "stars", "berufe"];
  const PLAYER_COLORS = ["#ff6b6b", "#4dabf7", "#51cf66", "#fcc419", "#cc5de8", "#ff922b", "#20c997", "#f06595", "#339af0", "#94d82d"];
  const COVER_GRADIENTS = [
    ["#ffd43b", "#ff922b"], ["#63e6be", "#1c7ed6"], ["#ff8787", "#e64980"], ["#b197fc", "#7048e8"],
    ["#8ce99a", "#2f9e44"], ["#74c0fc", "#4263eb"], ["#ffa94d", "#f03e3e"], ["#f783ac", "#ae3ec9"]
  ];

  const $ = (id) => document.getElementById(id);

  // ---------- Begriffe ----------
  const categories = (window.CATEGORIES || [])
    .map((c) => ({
      ...c,
      words: c.list.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
        const [word, hint] = l.split("|").map((s) => s.trim());
        return { word, hint, cat: c.id };
      })
    }))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id));
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

  // ---------- Speicher ----------
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* privater Modus */ }
    }
  };

  const defaults = {
    players: ["", "", "", ""],
    imposters: 1,
    randomImposters: false,
    categories: categories.map((c) => c.id),
    hints: true,
    timerOn: true,
    timerSeconds: 180
  };
  const settings = Object.assign({}, defaults, store.get(STORAGE_KEY, {}));
  settings.categories = settings.categories.filter((id) => catById[id]);
  if (!Array.isArray(settings.players) || settings.players.length < MIN_PLAYERS) settings.players = defaults.players.slice();
  const save = () => store.set(STORAGE_KEY, settings);

  let game = null;

  // ---------- Hilfen ----------
  const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const playerName = (i) => (settings.players[i] || "").trim() || `Spieler ${i + 1}`;
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* egal */ } };

  // ---------- Bildschirme ----------
  const screens = ["players", "setup", "reveal", "play", "solution"];
  function show(name) {
    screens.forEach((s) => { $(`screen-${s}`).hidden = s !== name; });
    document.body.className = `theme-${name}`;
    if (name === "players") renderPlayers();
    if (name === "setup") renderSetup();
  }

  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));

  // ---------- 1. Spieler ----------
  function renderPlayers() {
    const list = $("player-list");
    list.innerHTML = "";
    settings.players.forEach((name, i) => {
      const li = el("li");
      const av = el("div", "avatar", (name.trim()[0] || String(i + 1)).toUpperCase());
      av.style.background = PLAYER_COLORS[i % PLAYER_COLORS.length];
      const input = el("input");
      input.type = "text";
      input.value = name;
      input.placeholder = `Spieler ${i + 1}`;
      input.maxLength = 18;
      input.autocomplete = "off";
      input.enterKeyHint = "next";
      input.addEventListener("input", () => {
        settings.players[i] = input.value;
        av.textContent = (input.value.trim()[0] || String(i + 1)).toUpperCase();
        save();
        $("players-error").textContent = "";
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const next = list.querySelectorAll("input")[i + 1];
          next ? next.focus() : input.blur();
        }
      });
      const rm = el("button", "remove", "✕");
      rm.setAttribute("aria-label", "Spieler entfernen");
      rm.disabled = settings.players.length <= MIN_PLAYERS;
      rm.style.visibility = rm.disabled ? "hidden" : "visible";
      rm.addEventListener("click", () => {
        settings.players.splice(i, 1);
        save();
        renderPlayers();
      });
      li.append(av, input, rm);
      list.append(li);
    });
    $("players-count").textContent = settings.players.length;
    $("players-minus").disabled = settings.players.length <= MIN_PLAYERS;
    $("players-plus").disabled = settings.players.length >= MAX_PLAYERS;
    $("add-player").hidden = settings.players.length >= MAX_PLAYERS;
  }

  function addPlayer(focus) {
    if (settings.players.length >= MAX_PLAYERS) return;
    settings.players.push("");
    save();
    renderPlayers();
    if (focus) {
      const inputs = $("player-list").querySelectorAll("input");
      inputs[inputs.length - 1].focus();
    }
  }
  $("players-plus").addEventListener("click", () => addPlayer(false));
  $("add-player").addEventListener("click", () => addPlayer(true));
  $("players-minus").addEventListener("click", () => {
    if (settings.players.length <= MIN_PLAYERS) return;
    settings.players.pop();
    save();
    renderPlayers();
  });

  $("players-confirm").addEventListener("click", () => {
    const names = settings.players.map((_, i) => playerName(i).toLowerCase());
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) {
      const err = $("players-error");
      err.textContent = `Der Name „${playerName(names.indexOf(dup))}“ kommt doppelt vor.`;
      err.classList.add("error");
      vibrate(80);
      return;
    }
    show("setup");
  });

  // ---------- 2. Spielmodus ----------
  const maxImposters = () => settings.players.length - 1;

  function renderSetup() {
    settings.imposters = Math.min(Math.max(1, settings.imposters), maxImposters());
    $("imp-count").textContent = settings.randomImposters ? "?" : settings.imposters;
    $("imp-minus").disabled = settings.randomImposters || settings.imposters <= 1;
    $("imp-plus").disabled = settings.randomImposters || settings.imposters >= maxImposters();
    $("imp-count").closest(".counter-row").classList.toggle("disabled", settings.randomImposters);
    $("random-imp").checked = settings.randomImposters;
    $("hints").checked = settings.hints;
    $("timer-on").checked = settings.timerOn;
    $("timer-row").classList.toggle("disabled", !settings.timerOn);
    $("time-value").textContent = fmtTime(settings.timerSeconds);
    $("time-minus").disabled = settings.timerSeconds <= MIN_TIME;
    $("time-plus").disabled = settings.timerSeconds >= MAX_TIME;

    const grid = $("cat-grid");
    grid.innerHTML = "";
    categories.forEach((c) => {
      const b = el("button", "cat");
      b.style.setProperty("--cat-color", c.color);
      b.classList.toggle("on", settings.categories.includes(c.id));
      b.append(el("span", "ico", c.icon), el("span", "name", c.name), el("span", "num", `${c.words.length} Begriffe`));
      b.addEventListener("click", () => {
        const idx = settings.categories.indexOf(c.id);
        if (idx >= 0) settings.categories.splice(idx, 1);
        else settings.categories.push(c.id);
        save();
        renderSetup();
      });
      grid.append(b);
    });
    const n = settings.categories.reduce((sum, id) => sum + catById[id].words.length, 0);
    const err = $("setup-error");
    err.classList.toggle("error", n === 0);
    err.textContent = n === 0 ? "Wähle mindestens eine Kategorie." : `${n} Begriffe im Topf`;
    $("start-reveal").disabled = n === 0;
  }

  $("imp-minus").addEventListener("click", () => { settings.imposters--; save(); renderSetup(); });
  $("imp-plus").addEventListener("click", () => { settings.imposters++; save(); renderSetup(); });
  $("random-imp").addEventListener("change", (e) => { settings.randomImposters = e.target.checked; save(); renderSetup(); });
  $("hints").addEventListener("change", (e) => { settings.hints = e.target.checked; save(); });
  $("timer-on").addEventListener("change", (e) => { settings.timerOn = e.target.checked; save(); renderSetup(); });
  $("time-minus").addEventListener("click", () => {
    settings.timerSeconds = Math.max(MIN_TIME, settings.timerSeconds - TIME_STEP); save(); renderSetup();
  });
  $("time-plus").addEventListener("click", () => {
    settings.timerSeconds = Math.min(MAX_TIME, settings.timerSeconds + TIME_STEP); save(); renderSetup();
  });
  $("cat-all").addEventListener("click", () => { settings.categories = categories.map((c) => c.id); save(); renderSetup(); });
  $("cat-none").addEventListener("click", () => { settings.categories = []; save(); renderSetup(); });
  $("start-reveal").addEventListener("click", startGame);

  // ---------- Spiel erzeugen ----------
  function pickWord() {
    const pool = settings.categories.flatMap((id) => catById[id].words);
    const used = new Set(store.get(USED_KEY, []));
    let fresh = pool.filter((w) => !used.has(w.word));
    if (fresh.length === 0) {
      // Alle Begriffe der Auswahl schon gespielt -> von vorne beginnen
      pool.forEach((w) => used.delete(w.word));
      fresh = pool;
    }
    const choice = fresh[Math.floor(Math.random() * fresh.length)];
    const history = [...used, choice.word].slice(-1500);
    store.set(USED_KEY, history);
    return choice;
  }

  function startGame() {
    const n = settings.players.length;
    const count = settings.randomImposters
      ? randInt(1, Math.max(1, Math.floor(n / 2)))
      : Math.min(settings.imposters, n - 1);
    const imposters = new Set(shuffle([...Array(n).keys()]).slice(0, count));
    const word = pickWord();
    game = {
      names: settings.players.map((_, i) => playerName(i)),
      imposters,
      word,
      hints: settings.hints,
      index: 0,
      starter: randInt(0, n - 1)
    };
    requestWakeLock();
    show("reveal");
    renderReveal();
  }

  // ---------- Hochzieh-Karte ----------
  function makeSwipe(area, cover, onReveal) {
    let startY = null;
    let dy = 0;
    let pointerId = null;

    const setY = (y) => { cover.style.transform = `translateY(${y}px)`; };
    const reset = (animate) => {
      cover.classList.toggle("snap", animate);
      setY(0);
      dy = 0;
    };

    cover.addEventListener("pointerdown", (e) => {
      if (pointerId !== null) return;
      pointerId = e.pointerId;
      startY = e.clientY;
      cover.classList.remove("snap");
      try { cover.setPointerCapture(e.pointerId); } catch (err) { /* ältere Browser */ }
    });
    cover.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pointerId) return;
      const h = area.clientHeight;
      dy = Math.max(-h * 0.88, Math.min(0, e.clientY - startY));
      setY(dy);
      if (-dy > h * 0.35) onReveal();
    });
    const end = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      reset(true);
    };
    cover.addEventListener("pointerup", end);
    cover.addEventListener("pointercancel", end);
    cover.addEventListener("lostpointercapture", end);

    return { reset };
  }

  // ---------- 3. Karten verteilen ----------
  let revealedOnce = false;
  const revealSwipe = makeSwipe($("reveal-area"), $("reveal-cover"), () => {
    if (!revealedOnce) {
      revealedOnce = true;
      vibrate(25);
      $("reveal-next").disabled = false;
      $("reveal-info").textContent = "Gemerkt? Dann loslassen und weitergeben.";
    }
  });

  function renderReveal() {
    const i = game.index;
    const n = game.names.length;
    revealedOnce = false;
    revealSwipe.reset(false);

    $("reveal-progress").textContent = `Spieler ${i + 1} von ${n}`;
    $("reveal-name").textContent = game.names[i];
    $("reveal-cover-name").textContent = game.names[i];
    const [c1, c2] = COVER_GRADIENTS[i % COVER_GRADIENTS.length];
    $("reveal-cover").style.setProperty("--cover1", c1);
    $("reveal-cover").style.setProperty("--cover2", c2);
    $("reveal-next").disabled = true;
    $("reveal-next").textContent = i === n - 1 ? "Spiel starten 🚀" : "Weiter";
    $("reveal-info").textContent = "Zieh die Karte hoch, um deinen Begriff zu sehen.";

    const secret = $("reveal-secret");
    secret.innerHTML = "";
    if (game.imposters.has(i)) {
      secret.className = "secret imposter";
      secret.append(el("div", "big-emoji", "🕵️"), el("div", "word", "IMPOSTER"));
      if (game.hints) {
        secret.append(el("div", "small", "Dein Tipp:"), el("div", "tip", game.word.hint));
      } else {
        secret.append(el("div", "small", "Kein Tipp – bluffe dich durch!"));
      }
    } else {
      secret.className = "secret";
      secret.append(el("div", "tag", "Dein Begriff"), el("div", "word", game.word.word), el("div", "small", "Verrate ihn nicht zu direkt 😉"));
    }
  }

  $("reveal-next").addEventListener("click", () => {
    if (!revealedOnce) return;
    // Geheimnis sofort leeren, damit der nächste Spieler nichts sieht
    $("reveal-secret").innerHTML = "";
    if (game.index < game.names.length - 1) {
      game.index++;
      renderReveal();
      const scr = $("screen-reveal");
      scr.style.animation = "none";
      void scr.offsetWidth;
      scr.style.animation = "";
    } else {
      startPlay();
    }
  });

  // ---------- Abbrechen ----------
  function confirmDialog(text, onYes) {
    $("confirm-text").textContent = text;
    $("confirm-modal").hidden = false;
    $("confirm-yes").onclick = () => { $("confirm-modal").hidden = true; onYes(); };
    $("confirm-no").onclick = () => { $("confirm-modal").hidden = true; };
  }
  $("reveal-abort").addEventListener("click", () => confirmDialog("Runde abbrechen und zurück zu den Einstellungen?", () => {
    stopTimer();
    releaseWakeLock();
    show("setup");
  }));

  // ---------- 4. Timer ----------
  const timer = { remaining: 0, total: 0, running: false, endAt: 0, handle: null, done: false };

  function startPlay() {
    $("starter-name").textContent = game.names[game.starter];
    $("play-timer-on").checked = settings.timerOn;
    show("play");
    timer.done = false;
    if (settings.timerOn) startTimer(settings.timerSeconds);
    renderTimerVisibility();
  }

  function renderTimerVisibility() {
    const on = $("play-timer-on").checked;
    $("timer-wrap").hidden = !on;
    $("timer-controls").hidden = !on;
    $("no-timer").hidden = on;
  }

  function startTimer(seconds) {
    stopTimer();
    timer.total = seconds;
    timer.remaining = seconds;
    timer.running = true;
    timer.endAt = Date.now() + seconds * 1000;
    timer.handle = setInterval(tick, 200);
    renderTimer();
  }

  function stopTimer() {
    clearInterval(timer.handle);
    timer.handle = null;
    timer.running = false;
  }

  function tick() {
    if (!timer.running) return;
    timer.remaining = Math.max(0, (timer.endAt - Date.now()) / 1000);
    renderTimer();
    if (timer.remaining <= 0 && !timer.done) {
      timer.done = true;
      stopTimer();
      alarm();
      setTimeout(() => { if (!$("screen-play").hidden) showSolution(); }, 1400);
    }
  }

  function renderTimer() {
    const secs = Math.ceil(timer.remaining);
    $("timer-text").textContent = fmtTime(secs);
    const frac = timer.total ? timer.remaining / timer.total : 0;
    $("ring-fg").style.strokeDashoffset = String(RING_LENGTH * (1 - Math.min(1, frac)));
    $("timer-wrap").classList.toggle("warn", secs <= 10);
    $("t-toggle").textContent = timer.running ? "⏸" : "▶";
    $("t-toggle").setAttribute("aria-label", timer.running ? "Pause" : "Weiter");
  }

  function adjustTimer(delta) {
    timer.remaining = Math.max(1, Math.min(MAX_TIME, timer.remaining + delta));
    timer.total = Math.max(timer.total, timer.remaining);
    timer.done = false;
    if (timer.running) timer.endAt = Date.now() + timer.remaining * 1000;
    renderTimer();
  }

  $("t-minus").addEventListener("click", () => adjustTimer(-TIME_STEP));
  $("t-plus").addEventListener("click", () => adjustTimer(TIME_STEP));
  $("t-toggle").addEventListener("click", () => {
    if (timer.running) {
      stopTimer();
    } else if (timer.remaining > 0) {
      timer.running = true;
      timer.endAt = Date.now() + timer.remaining * 1000;
      timer.handle = setInterval(tick, 200);
    }
    renderTimer();
  });
  $("play-timer-on").addEventListener("change", (e) => {
    if (e.target.checked) startTimer(settings.timerSeconds);
    else stopTimer();
    renderTimerVisibility();
  });
  $("to-solution").addEventListener("click", () => {
    if (timer.running) {
      confirmDialog("Timer läuft noch. Jetzt schon auflösen?", showSolution);
    } else {
      showSolution();
    }
  });

  function alarm() {
    vibrate([300, 150, 300, 150, 500]);
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      [0, 0.3, 0.6].forEach((t, k) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.value = k === 2 ? 1040 : 780;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.27);
      });
      setTimeout(() => ctx.close(), 1500);
    } catch (e) { /* kein Ton möglich */ }
  }

  // ---------- 5. Auflösung ----------
  let solutionShown = false;
  const solutionSwipe = makeSwipe($("solution-area"), $("solution-cover"), () => {
    if (!solutionShown) {
      solutionShown = true;
      vibrate([40, 40, 40]);
      confetti();
    }
  });

  function showSolution() {
    stopTimer();
    releaseWakeLock();
    solutionShown = false;
    solutionSwipe.reset(false);
    show("solution");

    const secret = $("solution-secret");
    secret.innerHTML = "";
    secret.className = "secret solution";
    const imps = [...game.imposters].sort((a, b) => a - b).map((i) => game.names[i]);
    secret.append(el("div", "big-emoji", "🕵️"), el("div", "tag", imps.length === 1 ? "Der Imposter war" : `Die ${imps.length} Imposter waren`));
    const list = el("div", "sol-list");
    imps.forEach((name) => list.append(el("span", "sol-chip", name)));
    secret.append(list);

    const box = el("div", "sol-word");
    box.append(el("div", "small", `Begriff (${catById[game.word.cat].name})`), el("b", "", game.word.word));
    if (game.hints) box.append(el("div", "small", `Tipp für Imposter: ${game.word.hint}`));
    secret.append(box);
  }

  $("sol-again").addEventListener("click", startGame);
  $("sol-settings").addEventListener("click", () => show("setup"));

  function confetti() {
    const colors = ["#ffd43b", "#ff6b6b", "#4dabf7", "#51cf66", "#cc5de8", "#ffffff"];
    for (let i = 0; i < 70; i++) {
      const c = el("div", "confetti");
      c.style.left = `${Math.random() * 100}vw`;
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = `${1.6 + Math.random() * 1.8}s`;
      c.style.animationDelay = `${Math.random() * 0.4}s`;
      document.body.append(c);
      setTimeout(() => c.remove(), 4200);
    }
  }

  // ---------- Bildschirm wach halten ----------
  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      }
    } catch (e) { wakeLock = null; }
  }
  function releaseWakeLock() {
    try { wakeLock && wakeLock.release(); } catch (e) { /* egal */ }
    wakeLock = null;
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && game && (!$("screen-reveal").hidden || !$("screen-play").hidden)) requestWakeLock();
  });

  // ---------- Offline ----------
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  show("players");
})();
