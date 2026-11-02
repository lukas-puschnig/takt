# Lizenzen

Takt selbst steht unter der [MIT-Lizenz](../LICENSE). Das gilt auch für das Logo und die Marken-Dateien in `src/assets/brand`.

## In der App ausgelieferte Fremdbestandteile

| Bestandteil                                                                          | Verwendung       | Lizenz                    |
| ------------------------------------------------------------------------------------ | ---------------- | ------------------------- |
| [Instrument Serif](https://github.com/Instrument/instrument-serif) (über Fontsource) | Titel, Wortmarke | SIL Open Font License 1.1 |
| [Manrope](https://github.com/sharanda/manrope) (über Fontsource)                     | UI-Schrift       | SIL Open Font License 1.1 |
| [Lucide](https://lucide.dev) (`@lucide/svelte`)                                      | Icons            | ISC                       |
| [Svelte](https://svelte.dev) inkl. Laufzeit-Hilfspakete (clsx, devalue, esm-env)     | Framework        | MIT                       |
| [Workbox](https://developer.chrome.com/docs/workbox) (über vite-plugin-pwa)          | Service Worker   | MIT                       |
| [Tailwind CSS](https://tailwindcss.com) (Preflight im CSS-Bundle)                    | Styles           | MIT                       |

Die Lizenztexte der Schriften und Icons werden mit der App unter `licenses/` ausgeliefert (Quelle: `public/licenses/`), wie es die OFL beim Weitergeben der Schriftdateien verlangt.

## Nur Entwicklungswerkzeuge (nicht in der App enthalten)

Build- und Prüfwerkzeuge (Vite, TypeScript, ESLint, Prettier, Vitest, sharp u. a.) sind überwiegend MIT, Apache-2.0, ISC, BSD oder BlueOak lizenziert. Einzelne Ausnahmen, alle unkritisch, weil sie nicht ausgeliefert werden:

- `lightningcss` (MPL-2.0), CSS-Compiler im Build
- `@img/sharp-libvips` (LGPL-3.0), Bildbibliothek für `npm run icons`
- `caniuse-lite` (CC-BY-4.0), Browser-Daten für den Build

Prüfen: `npx license-checker-rseidelsohn --production --summary`
