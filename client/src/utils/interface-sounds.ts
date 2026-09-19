export type InterfaceSound = 'success' | 'cancel'

const preferenceKey = 'campusreserve:interface-sounds'

export function interfaceSoundsEnabled(): boolean {
  return window.localStorage.getItem(preferenceKey) !== 'off'
}

export function setInterfaceSoundsEnabled(enabled: boolean): void {
  window.localStorage.setItem(preferenceKey, enabled ? 'on' : 'off')
}

export function playInterfaceSound(sound: InterfaceSound): void {
  if (!interfaceSoundsEnabled()) return
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return
  const context = new AudioContextClass()
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.34)
  gain.connect(context.destination)
  const notes = sound === 'success' ? [523.25, 659.25] : [392, 293.66]
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    oscillator.connect(gain)
    oscillator.start(context.currentTime + index * 0.09)
    oscillator.stop(context.currentTime + 0.25 + index * 0.09)
  })
  window.setTimeout(() => void context.close(), 550)
}
