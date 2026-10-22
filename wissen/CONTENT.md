# Inhaltsformat der Slides

Jede Datei in `js/data/` ist ein Skript, das Slides an `window.SLIDES` anhängt:

```js
// Politik – Deutschland
(window.SLIDES = window.SLIDES || []).push(
  { id: "pde-001", cat: "politik", topic: "Grundgesetz", type: "fact", emoji: "📜", level: 1,
    title: "…", text: "…", more: "…" },
  …
);
```

## Gemeinsame Felder (Pflicht)
| Feld | Bedeutung |
|---|---|
| `id` | Eindeutig, Präfix der Datei + dreistellige Nummer, z. B. `pde-001` |
| `cat` | `politik` · `vwl` · `geschichte` · `bwl` · `finanzen` |
| `topic` | Kurzes Unterthema (1–3 Wörter), z. B. „Bundestag“, „Inflation“, „Bilanz“. Gleiche Themen gleich schreiben. |
| `type` | siehe unten |
| `emoji` | Genau ein passendes Emoji (dient als Bild) |
| `level` | 1 = Basis, 2 = Fortgeschritten, 3 = Experte |

## Typen
| type | Felder | Zweck |
|---|---|---|
| `fact` | `title` (≤ 70 Z.), `text` (≤ 280 Z.), `more`? | Prägnanter Fakt / Konzept |
| `event` | `year` (String, z. B. „1989“ oder „44 v. Chr.“), `title`, `text`, `more`? | Ereignis mit Datum |
| `number` | `value` (z. B. „2 %“), `label` (≤ 60 Z.), `text`, `more`? | Eine große Zahl, die hängen bleibt |
| `flashcard` | `term`, `def` (≤ 220 Z.), `example`? | Begriff → Karte umdrehen |
| `quiz` | `q`, `options` (3–4 Strings), `answer` (Index ab 0), `explain` | Multiple Choice |
| `truefalse` | `q` (Behauptung), `answer` (true/false), `explain` | Wahr oder Falsch / Mythos-Check |
| `whatif` | `q` („Was passiert, wenn …?“), `steps` (3–5 kurze Kettenglieder, je ≤ 45 Z.), `text` (Erklärung) | Wirkungsketten verstehen |
| `order` | `q`, `items` (3–5 Strings **in richtiger Reihenfolge**), `explain` | Reihenfolge / Zeitstrahl sortieren |

`more` (optional, ≤ 400 Z.) ist die „Verstehen“-Ebene: Warum ist das wichtig, Zusammenhang, Merkhilfe.

## Stil
- Deutsch, klar, aktiv, kurz. Ein Gedanke pro Slide. Lieber konkret mit Zahl/Beispiel als abstrakt.
- Nur Fakten, bei denen man sich sicher ist. Zeitabhängiges mit Stand kennzeichnen („Stand 2025“).
- Quiz-Distraktoren plausibel, richtige Antwort nicht immer an derselben Position.
- `**fett**` ist erlaubt für Schlüsselbegriffe.

Prüfen: `node wissen/tools/check-slides.js`
