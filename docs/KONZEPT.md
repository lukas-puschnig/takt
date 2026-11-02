# Takt – Konzept

Installierbare Web-App (PWA) mit zwei Säulen: **Fokus-Blöcke planen und durchziehen** und **tägliche Routinen abhaken**. Ruhig gestaltet (siehe [DESIGN.md](DESIGN.md)), Daten lokal, kein Konto nötig.

Status: ✅ umgesetzt · 🚧 in Arbeit · ⏳ geplant

---

## 1. Tägliche Routinen (Dailies) ✅

Wiederkehrende Aufgaben nach dem Vorbild der Habitica-Dailies, aber ohne Spielmechanik.

**Aufbau**

- **Routine** = großer Block, z. B. „Morgens“ oder „Abends“, optional mit Uhrzeit und Notiz.
- **Schritte** = Subtasks einer Routine, z. B. „Open Books“, „Flankenatmung“. Ohne Schritte wird die Routine als Ganzes abgehakt.
- Eine Routine ist erledigt, sobald alle an dem Tag fälligen Schritte abgehakt sind. Ein Tipp auf den Fortschrittsring hakt alle Schritte auf einmal ab.

**Rhythmus (flexibel)**

- Wochentage frei wählbar, mit Schnellwahl Täglich / Werktags / Wochenende.
- Alternativ alle N Tage ab einem Starttag.
- **Schritte können zusätzlich auf Wochentage eingeschränkt werden**, z. B. „Rückenblock“ nur Mo/Mi/Fr innerhalb der täglichen Morgenroutine.
- Routinen lassen sich pausieren, ohne den Verlauf zu verlieren.

**Anzeige**

- Heute-Ansicht mit Wochenleiste: pro Tag ein kleiner Ring mit dem Anteil erledigter Schritte.
- Antippen eines Tages zeigt ihn an. Vergangene Tage können nachgetragen werden („gestern vergessen“), zukünftige sind Vorschau.
- Karten pro Routine mit Fortschrittsring, Zähler, Serie („5 in Folge“). Erledigte Routinen klappen auf Wunsch ein.
- Nicht fällige Routinen stehen eingeklappt darunter.

**Einstellungen**

- Tagesgrenze (0–6 Uhr): Bis dahin zählt die Nacht zum Vortag, damit die Abendroutine nach Mitternacht noch zählt.
- Wochenstart Montag oder Sonntag.
- Design System / Hell / Dunkel.
- Reihenfolge der Routinen, Export/Import als JSON, alles löschen.

**Serien-Logik:** Gezählt werden aufeinanderfolgende *fällige* Tage, an denen die Routine komplett war. Nicht fällige Tage werden übersprungen, ein noch offener heutiger Tag bricht die Serie nicht. Beim Abhaken wird der Erledigt-Status als Momentaufnahme gespeichert, damit spätere Änderungen an den Schritten den Verlauf nicht umschreiben.

**Ideen für später** ⏳

- Schritte per Drag & Drop sortieren (aktuell Pfeile).
- Weitere Rhythmen: bestimmte Tage im Monat, „x-mal pro Woche, egal wann“.
- Statistik: Erledigungsquote pro Routine und Schritt über Wochen, Heatmap.
- Erinnerungen (Push) zur Uhrzeit der Routine.
- Verknüpfung mit dem Fokus-Teil: Pausenübungen aus einer Routine ziehen.

---

## 2. Fokus-Planer und Timer ⏳

**Funktionen**

1. **Zeitfenster eingeben:** Start- und Endzeit (z. B. Ankunft im Büro bis Mittagessen).
2. **Regler 0–100 % zwischen Light Work und Deep Work.** Daraus plant die App die Takte.
3. **Art des Tages:** z. B. Deep Work mit Ideenfindung oder Admin mit kurzen Aufgaben.
4. **Timer** mit Fortschrittsring (DESIGN.md §5).
5. **Abfrage nach jedem Block:** Wie fokussiert war ich (1–5)?
6. **Ablenkung reduzieren:** Vollbild, Bildschirm wach halten, Ziel vor Augen.

**Planlogik (Vorschlag)**

- 100 % Deep Work: Blöcke von ca. 50 min, 10 min Pause.
- 0 % Light Work: Blöcke von ca. 25 min, 5 min Pause.
- Dazwischen gleitend; nach 3–4 Blöcken eine längere Pause (15–30 min).
- Der letzte Block wird so angepasst, dass das Zeitfenster genau aufgeht.

**Ergänzungen**

- Startritual: vor jedem Block eine Zeile „Was ist das konkrete Ergebnis?“
- Ablenkungs-Notizbox, die nach dem Block angezeigt wird.
- Signal und Vibration am Blockende.
- Bewegungspausen: in Pausen eine konkrete, bürotaugliche Mini-Übung vorschlagen (Seated Twist, Brust öffnen an der Türzarge, Nackenrotation, Hüftbeuger im Stehen, Schulterkreisen). Eigene Übungsbibliothek.
- Fokus-Log pro Block: Datum, Startzeit, Dauer, Reglerwert, Ziel, Fokus 1–5, Ort (Büro, Datenzentrum, zu Hause), Art der Arbeit, Notizen.
- Tagesübersicht („3 Takte heute“, Minuten Deep Work) und Wochenauswertung mit einfachen Diagrammen.
- Abschaltbare Erinnerungen (Tagesplan am Morgen, Log am Abend).

**Grenzen:** Eine PWA kann das Handy nicht sperren und keine Apps blockieren. Ergänzend Fokus-Modus / Digital Wellbeing des Systems nutzen.

---

## 3. Daten, Sync, Hosting

- **Lokal zuerst:** Alles im Browser (aktuell `localStorage`), Export/Import als JSON, Löschen mit einem Klick. ✅
- **Export für Auswertung mit Claude:** JSON-Datei, später zusätzlich CSV und „in Zwischenablage kopieren“. 🚧
- **Speicherschicht:** Die App spricht nur mit einem `StorageAdapter` (`src/lib/storage/adapter.ts`). ✅
- **Sync:** zuerst Nextcloud per WebDAV (Zugangsdaten nur im Browser, nie im Repo). Später für andere Nutzer evtl. Supabase oder Firebase mit Login. ⏳
- **Hosting:** GitHub Pages über GitHub Actions (`.github/workflows/deploy.yml`). Das Repo enthält nur die App-Hülle, keine Daten und keine Schlüssel. ✅
- **Anpassbar:** Blocklängen, Pausen, Reglerstandard, Übungsbibliothek; Sprache Deutsch (Englisch später), Hell/Dunkel. 🚧

---

## 4. Reihenfolge der Umsetzung

1. ✅ Projekt-Setup (Vite, Svelte 5, TypeScript, Tailwind v4, PWA, Tests, Lint), Marken-Tokens und Icons
2. ✅ Tägliche Routinen
3. ⏳ Fokus: Planlogik (Regler → Takte) mit Tests, dann Timer
4. ⏳ Fokus-Log, Abfrage nach dem Block, Tagesübersicht
5. ⏳ Auswertung, CSV-Export
6. ⏳ Nextcloud-Sync
