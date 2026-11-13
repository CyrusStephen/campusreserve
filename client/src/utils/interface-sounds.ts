export type InterfaceSound = 'success' | 'cancel'

const preferenceKey = 'campusreserve:interface-sounds'
let audioContext: AudioContext | null = null

export function interfaceSoundsEnabled(): boolean {
  return window.localStorage.getItem(preferenceKey) !== 'off'
}

export function setInterfaceSoundsEnabled(enabled: boolean): void {
  window.localStorage.setItem(preferenceKey, enabled ? 'on' : 'off')
}

function context(): AudioContext | null {
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null
  audioContext ??= new AudioContextClass()
  return audioContext
}

// A tap/key press unlocks browser audio before a login or booking API response arrives.
export function unlockInterfaceAudio(): void {
  if (!interfaceSoundsEnabled()) return
  const audio = context()
  if (audio?.state === 'suspended') void audio.resume().catch(() => undefined)
}

export function playInterfaceSound(sound: InterfaceSound): void {
  if (!interfaceSoundsEnabled()) return
  const audio = context()
  if (!audio) return
  const play = () => {
    const start = audio.currentTime
    const notes = sound === 'success' ? [523.25, 783.99] : [440, 329.63]
    notes.forEach((frequency, index) => {
      const at = start + index * 0.11
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      oscillator.type = sound === 'success' ? 'sine' : 'triangle'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25)
      oscillator.connect(gain)
      gain.connect(audio.destination)
      oscillator.start(at)
      oscillator.stop(at + 0.26)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    })
  }
  if (audio.state === 'running') play()
  else void audio.resume().then(play).catch(() => undefined)
}
