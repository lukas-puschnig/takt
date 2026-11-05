# Lizenzen

Der Code von Takt steht unter der [MIT-Lizenz](../LICENSE).

**Ausgenommen sind Logo, Wortmarke und App-Icons** (`src/assets/brand/`, `public/favicon.svg`, `public/icons/`). Sie sind © 2026 Lukas Puschnig, alle Rechte vorbehalten, und dürfen nur unverändert als Teil dieser Software verwendet werden. Wer einen Fork veröffentlicht, ersetzt sie bitte durch eigene.

## In der App ausgelieferte Fremdbestandteile

| Bestandteil                                                                          | Verwendung       | Lizenz                        |
| ------------------------------------------------------------------------------------ | ---------------- | ----------------------------- |
| [Instrument Serif](https://github.com/Instrument/instrument-serif) (über Fontsource) | Titel, Wortmarke | SIL Open Font License 1.1     |
| [Manrope](https://github.com/sharanda/manrope) (über Fontsource)                     | UI-Schrift       | SIL Open Font License 1.1     |
| [Lucide](https://lucide.dev) (`@lucide/svelte`)                                      | Icons            | ISC                           |
| [Svelte](https://svelte.dev) inkl. Laufzeit-Hilfspakete (clsx, devalue, esm-env)     | Framework        | MIT                           |
| [Workbox](https://developer.chrome.com/docs/workbox) (über vite-plugin-pwa)          | Service Worker   | MIT                           |
| [Tailwind CSS](https://tailwindcss.com) (Preflight im CSS-Bundle)                    | Styles           | MIT                           |
| [Emojibase](https://emojibase.dev) (`emojibase-data`, Namen aus Unicode CLDR)        | Emoji-Auswahl    | MIT; CLDR: Unicode License v3 |

Die Lizenztexte der Schriften und Icons werden mit der App unter `licenses/` ausgeliefert (Quelle: `public/licenses/`), wie es die OFL beim Weitergeben der Schriftdateien verlangt.

## Nur Entwicklungswerkzeuge (nicht in der App enthalten)

Build- und Prüfwerkzeuge (Vite, TypeScript, ESLint, Prettier, Vitest, sharp u. a.) sind überwiegend MIT, Apache-2.0, ISC, BSD oder BlueOak lizenziert. Einzelne Ausnahmen, alle unkritisch, weil sie nicht ausgeliefert werden:

- `lightningcss` (MPL-2.0), CSS-Compiler im Build
- `@img/sharp-libvips` (LGPL-3.0), Bildbibliothek für `npm run icons`
- `caniuse-lite` (CC-BY-4.0), Browser-Daten für den Build

Prüfen: `npx license-checker-rseidelsohn --production --summary`
