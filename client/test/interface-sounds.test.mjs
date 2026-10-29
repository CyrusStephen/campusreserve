import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'

test('a tap unlocks one audio context for later login and cancellation feedback', async (context) => {
  const originalWindow = globalThis.window
  let constructed = 0
  let played = 0
  let enabled = true
  const audio = {
    state: 'suspended', currentTime: 0, destination: {},
    resume() { this.state = 'running'; return Promise.resolve() },
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} } },
    createOscillator() { return { frequency: { value: 0 }, connect() {}, start() { played++ }, stop() {}, disconnect() {}, onended: null } },
  }
  globalThis.window = {
    AudioContext: class { constructor() { constructed++; return audio } },
    localStorage: { getItem() { return enabled ? 'on' : 'off' }, setItem(_key, value) { enabled = value === 'on' } },
  }
  context.after(() => { globalThis.window = originalWindow })
  const source = await readFile(new URL('../src/utils/interface-sounds.ts', import.meta.url), 'utf8')
  const javascript = stripTypeScriptTypes(source, { mode: 'strip' })
  const sounds = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
  sounds.unlockInterfaceAudio()
  await Promise.resolve()
  sounds.playInterfaceSound('success')
  sounds.playInterfaceSound('cancel')
  assert.equal(constructed, 1)
  assert.equal(played, 4)
  sounds.setInterfaceSoundsEnabled(false)
  sounds.playInterfaceSound('success')
  assert.equal(played, 4)
})
