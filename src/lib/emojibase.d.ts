// Schlanke Typen statt resolveJsonModule: die Datei ist groß, TypeScript soll sie nicht einlesen.
declare module 'emojibase-data/de/compact.json' {
  const data: { unicode: string; label: string; tags?: string[]; group?: number }[]
  export default data
}
