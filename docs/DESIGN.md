# Takt – Corporate Design

Leitfaden für die Umsetzung der Takt-PWA (Pomodoro/Fokus-App). Alle Werte stehen als CSS-Variablen in `tokens.css`; Logos liegen in `logo/`.

**Charakter:** ruhig, elegant, schlank. Viel Weißraum, feine Linien, zwei Markenfarben. Kein Gradient, keine Emojis, keine verspielten Effekte.

---

## 1. Logo

Ein sitzender Fuchs aus reinen Konturen, vertikal geteilt: linke Hälfte Fuchsia, rechte Hälfte Koralle. Der Schwanz schaut links als kleiner Bogen und rechts als geschwungene Spitze hinter dem Körper hervor.

| Datei | Einsatz |
|---|---|
| `logo/takt-logo-light.svg` / `-dark.svg` | Ganzer Fuchs, für Splash-Screen, Onboarding, Über-Seite, Website |
| `logo/takt-mark-light.svg` / `-dark.svg` | Nur Kopf, für Header, Favicon, kleine Größen (unter 64 px) |
| `logo/takt-appicon-light.svg` / `-dark.svg` | Kopf auf gerundeter Kachel, für PWA-Manifest und Apple-Touch-Icon |

**Regeln**
- Unter 64 px immer nur den Kopf (`mark`) verwenden.
- Schutzraum rund ums Logo: mindestens 25 % der Logo-Breite.
- Farben nie vertauschen: links immer Fuchsia, rechts immer Koralle.
- Nicht verzerren, nicht drehen, keine Schatten oder Verläufe, nicht füllen.
- Auf hellem Grund die `light`-Variante, auf dunklem Grund die `dark`-Variante.

**Wortmarke:** „Takt“ in Instrument Serif, Regular, Farbe `--color-text`. Neben dem Kopf mit Abstand ≈ 0,3 × Kopfhöhe, vertikal mittig.

**PWA-Icons:** Aus `takt-appicon-light.svg` PNGs in 192 px, 512 px und 180 px (Apple) erzeugen. Für `maskable` den Kopf auf ca. 60 % der Fläche verkleinern, damit er in der Safe Zone liegt. Als Favicon `takt-mark-light.svg` verwenden.

---

## 2. Farben

| Rolle | Hell | Dunkel | Verwendung |
|---|---|---|---|
| Primär (Fuchsia) | `#D61F8C` | `#FF4DB2` | Fokus-Phase, Hauptbutton, Fortschrittsring, Links |
| Akzent (Koralle) | `#FF7A59` | `#FF8F6B` | Pause-Phase, kleine Akzente. **Nie für Text** (zu wenig Kontrast) |
| Grund | `#F7F1F5` | `#17121C` | Seitenhintergrund |
| Fläche | `#FFFFFF` | `#221A29` | Karten, Sheets, sekundäre Buttons |
| Text | `#1E1520` | `#F5EEF3` | Fließtext, Timer |
| Text leise | `#6E5A69` | `#B79DB0` | Hinweise, Metadaten |
| Linie | `#E8DDE4` | `#3A2F40` | Rahmen, Trenner, Ring-Hintergrund |

- **Text auf Primär:** im hellen Modus Weiß (Kontrast 4,7 : 1), im dunklen Modus `#17121C` (Weiß hätte nur 3 : 1).
- **Phasenfarbe:** Fokus = Fuchsia, Pause = Koralle. Phase-Label, Ring und Fortschrittspunkte nehmen jeweils diese Farbe an.
- **Theme:** Standard ist das System-Theme (`prefers-color-scheme`). Ein manueller Umschalter setzt `data-theme="light|dark"` auf `<html>`.

---

## 3. Schrift

Beide Schriften sind kostenlos (SIL Open Font License) über Google Fonts verfügbar. Für den Offline-Betrieb der PWA selbst hosten, z. B. mit `@fontsource/instrument-serif` und `@fontsource-variable/manrope`.

- **Instrument Serif:** moderne, schmale Serifenschrift mit hohem Kontrast. Nur für Titel, große Zahlen auf Marketingseiten und die Wortmarke, nie für UI-Text. Die Kursive passt gut für einzelne betonte Wörter, gern in Fuchsia.
- **Manrope:** geometrische Groteske für die gesamte Oberfläche und den Timer. Der Timer läuft **immer mit `font-variant-numeric: tabular-nums`**, damit die Ziffern beim Herunterzählen nicht springen.

| Stil | Schrift | Größe / Zeilenhöhe | Sonstiges |
|---|---|---|---|
| Display | Instrument Serif 400 | 56 / 60 | Onboarding, leere Zustände |
| Titel | Instrument Serif 400 | 36 / 42 | Seitentitel |
| Überschrift | Manrope 600 | 20 / 28 | Abschnitte, Karten |
| Text | Manrope 400 | 16 / 24 | Standard |
| Klein | Manrope 500 | 13 / 18 | Metadaten |
| Label | Manrope 600 | 12 | VERSALIEN, Laufweite +0,14 em |
| Timer | Manrope 300 | 64–96 (`clamp`) | tabular-nums, Laufweite −0,02 em |

**Alternative (verworfen, nur als Notiz):** Jost als schlanke, serifenlose Komplettlösung mit der Wortmarke in Versalien, „TAKT“ mit +0,24 em Laufweite.

---

## 4. Raster, Abstände, Formen

- **Abstände:** 4er-Raster mit den Stufen 4, 8, 12, 16, 24, 32, 48 und 64 px.
- **Radien:**
  - 8 px für Eingaben und Chips
  - 14 px für kleine Karten
  - 22 px für große Karten und Sheets
  - Buttons voll gerundet (pill)
- **Linien:** 1 px in `--color-border`. Der Fortschrittsring ist 6 px stark und hat runde Enden.
- **Icons:** nur Konturen mit 1,75 px Strich, runden Enden und runden Ecken, im Stil des Logos (z. B. Lucide). Keine gefüllten Icons, keine Emojis.
- **Schatten:** sparsam, nur `--shadow-card` für schwebende Elemente.
- **Touch-Ziele:** mindestens 44 × 44 px, Hauptbuttons 52 px hoch.

---

## 5. Komponenten

- **Primärbutton:**
  - Pill-Form, 52 px hoch, horizontaler Innenabstand 32 px.
  - Hintergrund `--color-primary`, Text `--color-on-primary`, Manrope 600 in 16 px.
  - Beim Hover wird der Hintergrund zu `--color-primary-hover`.
- **Sekundärbutton:** Pill-Form, Hintergrund `--color-surface`, 1 px Rahmen in `--color-border`, Text `--color-text`, Manrope 500.
- **Karte:** Hintergrund `--color-surface`, Radius 22 px, Innenabstand 18–20 px. Im hellen Modus ohne Rahmen auf `--color-bg`.
- **Fortschrittsring:**
  - Größe 280 px (mobil).
  - Hintergrundring in `--color-ring-track`, Fortschritt in der jeweiligen Phasenfarbe.
  - Startet oben (`rotate(-90deg)`) und läuft im Uhrzeigersinn.
  - Die Restzeit steht mittig.
- **Phasen-Label:** Label-Stil in der Phasenfarbe („FOKUS“ / „PAUSE“), darunter in „Text leise“ der Hinweis „Runde 2 von 4“.
- **Rundenpunkte:**
  - 10 px große Kreise mit 6 px Abstand.
  - Erledigte Fokus-Runden in Primär, erledigte Pausen in Akzent, offene Runden in Linie.

**Referenz-Screens** (Timer hell und dunkel) liegen im Design-Canvas.

Aufbau von oben nach unten:
1. Header mit Kopf-Logo (32 px) und Wortmarke
2. Phase
3. Ring mit Zeit
4. Buttons
5. Tageskarte

---

## 6. Bewegung

- **Übergänge:** 150–250 ms mit `--ease`.
- **Phasenwechsel:** Die Farbe von Ring und Label blendet weich über (250 ms).
- **Ring:** Der Fortschritt läuft kontinuierlich und ohne Ruckeln (`stroke-dashoffset`, ca. 1×/s aktualisiert, mit `transition: stroke-dashoffset 1s linear`).
- **Reduzierte Bewegung:** Bei `prefers-reduced-motion` alle Animationen aus.

---

## 7. Ton & Sprache

- **Sprache:** Deutsch, du-Form, kurz und ruhig. Zum Beispiel „Zeit für eine Pause.“ statt „Super gemacht!!! 🎉“.
- **Zeitformat:** `mm:ss`, Dauern als „1 h 15 min“.
- **Eine Einheit heißt „Takt“:** „3 Takte heute“.

---

## 8. Hinweise für die Umsetzung (Claude Code)

1. `tokens.css` global einbinden und ausschließlich Variablen verwenden, keine hart codierten Hex-Werte.
2. Fonts selbst hosten (PWA offline) und `font-display: swap` setzen.
3. `manifest.webmanifest` anlegen:
   - `theme_color` `#D61F8C` (bzw. `#17121C` für dunkel per `media`-Meta-Tag)
   - `background_color` `#F7F1F5`
   - Icons aus `logo/takt-appicon-*.svg` exportieren (192, 512, maskable)
4. `<meta name="theme-color">` zweimal setzen, für hell und dunkel per `media="(prefers-color-scheme: …)"`.
5. Logos als Inline-SVG oder `<img>` einbinden, mit `alt="Takt"`. Rein dekorative Verwendung mit `aria-hidden="true"`.
6. Kontraste prüfen: Text mindestens 4,5 : 1. Koralle nie als Textfarbe.
