import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { initNative } from './lib/native/reminders'
import { app } from './lib/state/app.svelte'
import { focus } from './lib/state/focus.svelte'

await app.init()
// Android-App: Kanäle und Berechtigungen vor dem Timer, damit dessen Meldungen ankommen.
await initNative().catch((e) => console.error('Native Einrichtung fehlgeschlagen', e))
focus.init()

export default mount(App, {
  target: document.getElementById('app')!,
})
