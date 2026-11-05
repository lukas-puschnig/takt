import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { app } from './lib/state/app.svelte'
import { focus } from './lib/state/focus.svelte'

await app.init()
focus.init()

export default mount(App, {
  target: document.getElementById('app')!,
})
