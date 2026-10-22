# 📚 Wissensfeed – Lernen im Swipe-Format

Mobile Web-App (PWA) für die persönliche Weiterbildung: Politik, VWL, Geschichte, BWL und Finanzen
in rund 1.700 kurzen Slides – swipen wie bei TikTok, verstehen statt nur lesen.

## Funktionen
- **Feed „Für dich“** mit Kategorien-Tabs; wischt man nach oben, kommt die nächste Slide.
- **8 Slide-Typen:** Fakt, Ereignis (mit Zeitstrahl), Zahl (animiert), Lernkarte (umdrehen),
  Quiz, Wahr/Falsch, „Was passiert, wenn …?“-Wirkungsketten, Reihenfolge sortieren.
- **💡 Verstehen:** Vertiefung zu jeder Slide plus „Mehr zum Thema“.
- **Sammlung:** 🔖 Gemerkt, ♥ Likes (auch per Doppeltipp) und 🔁 Wiederholen als Raster wie bei TikTok.
- **Spaced Repetition:** Falsche Antworten und „Nochmal“-Lernkarten kommen in wachsenden Abständen wieder.
- **Spielerisch:** XP und Level, Combo-Multiplikator, Tagesziel mit Lernserie 🔥, 20 Abzeichen,
  ⚡ Quiz-Sprint (60 Sekunden) mit Rekord.
- **Entdecken:** Suche, Modi (nur Quiz, Lernkarten, Wirkungsketten, Zeitreise, Zahlen) und alle Themen mit Fortschritt.
- **Profil:** Statistik je Kategorie, Tagesziel, Interessen und Niveau (z. B. Basis ausblenden).

Alles läuft offline; der Fortschritt wird lokal im Browser gespeichert.

## Inhalte
Die Slides liegen in `js/data/*.js`, das Format ist in [`CONTENT.md`](CONTENT.md) beschrieben.
Nach Änderungen prüfen:

```
node wissen/tools/check-slides.js
```

## Starten
Lokal: `python3 -m http.server` im Repository-Ordner und `http://localhost:8000/wissen/` öffnen.
Über GitHub Pages liegt die App unter `…/wissen/` und lässt sich auf dem Handy zum Startbildschirm hinzufügen.
