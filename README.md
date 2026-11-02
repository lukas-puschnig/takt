# Takt

PWA für Fokus-Blöcke und tägliche Routinen. Konzept und Stand: [docs/KONZEPT.md](docs/KONZEPT.md), Corporate Design: [docs/DESIGN.md](docs/DESIGN.md).

## Stack

- [Vite](https://vite.dev) + [Svelte 5](https://svelte.dev) (Runes) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) – Utilities sind auf die Marken-Tokens in `src/styles/tokens.css` abgebildet (`bg-surface`, `text-text-muted`, `rounded-lg`, …), keine Hex-Werte im Code
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) (Workbox, offline, installierbar)
- Fonts selbst gehostet über Fontsource, Icons von [Lucide](https://lucide.dev)
- Vitest, ESLint, Prettier, svelte-check

## Entwicklung

```sh
npm install
npm run dev        # Dev-Server
npm test           # Unit-Tests (Vitest)
npm run check      # Typecheck (svelte-check + tsc)
npm run lint       # ESLint + Prettier-Check
npm run format     # Prettier schreiben
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal ansehen (inkl. Service Worker)
npm run icons      # PWA-Icons aus src/assets/brand neu erzeugen
```

## Struktur

```
src/
  lib/
    date.ts               Tages-Keys, Wochentage, Tagesgrenze
    routines/             Datenmodell, Fälligkeit, Fortschritt, Serien (+ Tests)
    storage/              StorageAdapter-Interface, localStorage-Umsetzung
    state/app.svelte.ts   App-Zustand (Runes) und Aktionen
  components/
    ui/                   Basis-Bausteine (Ring, Checkbox, Sheet, Switch, …)
    routines/             Routinen-Karte, Wochenleiste, Editor
  views/                  Heute, Fokus, Einstellungen
```

## Deployment

Push auf `main` baut und veröffentlicht über GitHub Actions auf GitHub Pages (`BASE_PATH` wird aus dem Repo-Namen gesetzt). In den Repo-Einstellungen unter _Pages_ als Quelle „GitHub Actions“ wählen.

## Datenschutz

- **Keine Daten verlassen das Gerät.** Routinen, Verlauf und Einstellungen liegen nur im `localStorage` des Browsers. Es gibt kein Konto, kein Tracking, keine Analytics und keine Cookies.
- **Keine Anfragen an Dritte.** Schriften und Icons sind im Build enthalten, es werden keine externen Ressourcen (z. B. Google Fonts oder CDNs) geladen.
- **Hosting:** Beim Abruf über GitHub Pages verarbeitet GitHub technisch bedingt Verbindungsdaten wie die IP-Adresse ([GitHub Privacy Statement](https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement)). Nach der Installation läuft die App offline aus dem Cache.
- **Export/Import** erzeugt bzw. liest nur lokale JSON-Dateien. Ein späterer Sync (Nextcloud) wird optional und die Zugangsdaten bleiben im Browser.

## Lizenz

Code: [MIT](LICENSE). Logo, Wortmarke und App-Icons sind davon ausgenommen (alle Rechte vorbehalten). Fremdbestandteile und ihre Lizenzen: [docs/LIZENZEN.md](docs/LIZENZEN.md).
