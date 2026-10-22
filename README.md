# 🕵️ Imposter – das Partyspiel fürs Handy

Farbenfrohe Web-App (PWA) für das Spiel „Imposter“. Läuft auf iPhone und Android im Browser,
lässt sich wie eine App auf den Startbildschirm legen und funktioniert danach auch offline.

## Ablauf
1. **Spieler**: Anzahl wählen, Namen eingeben/ändern, Spieler hinzufügen oder entfernen → *Spieler bestätigen*
2. **Spielmodus**: Anzahl Imposter (oder 🎲 zufällige Anzahl), Kategorien, Tipp für Imposter an/aus, Timer an/aus + Dauer
3. **Karten verteilen**: Das Handy geht reihum. Jeder zieht seine Karte hoch und sieht seinen Begriff –
   oder „IMPOSTER“ (mit oder ohne Tipp). Der letzte Spieler drückt *Spiel starten*.
4. **Spiel**: Timer läuft (pausieren, ±30 s, ein-/ausschalten). Die App lost aus, wer anfängt.
5. **Auflösung**: Nach Ablauf des Timers erscheint eine Karte zum Hochziehen, die die Imposter und den Begriff zeigt.

## Begriffe
2235 Begriffe in 10 Kategorien (Alltagsbegriffe mit 576 der größte Anteil), jeweils mit einem Tipp,
der nur „um zwei Ecken“ mit dem Begriff zu tun hat. Die Listen liegen in `js/words/*.js`
(eine Zeile pro Begriff: `Begriff|Tipp`). Bereits gespielte Begriffe werden gemerkt und erst wieder
gezogen, wenn alle Begriffe der Auswahl durch sind.

Nach Änderungen an den Listen prüfen (Anzahl, Duplikate, Format):

```
node tools/check-words.js
```

## Aufs Handy bringen
Die App ist eine statische Webseite, z. B. über **GitHub Pages**:
Repository → *Settings* → *Pages* → *Deploy from a branch* → Branch wählen, Ordner `/ (root)`.
Dann die Seite auf dem Handy öffnen und
- **iPhone (Safari)**: Teilen → „Zum Home-Bildschirm“
- **Android (Chrome)**: Menü ⋮ → „App installieren“ / „Zum Startbildschirm hinzufügen“

Lokal testen: `python3 -m http.server` im Projektordner und `http://localhost:8000` öffnen.

---

## 📚 Außerdem im Repository: Wissensfeed
Im Ordner [`wissen/`](wissen/) liegt eine zweite App – ein TikTok-artiger Lernfeed zu Politik, VWL,
Geschichte, BWL und Finanzen mit über 1.000 Slides. Details in [`wissen/README.md`](wissen/README.md).
