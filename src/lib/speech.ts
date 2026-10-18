/**
 * Lectura en voz alta con la sintesis de voz del navegador (speechSynthesis,
 * D11): gratis y sin servidor. La calidad depende del sistema operativo.
 *
 * `onend` no es confiable en todos los navegadores (Chrome a veces no lo
 * dispara con textos largos o si la pestaña pierde el foco). Por eso hay un
 * tiempo maximo estimado: si el evento no llega, se da por terminado igual,
 * para que el boton "Continuar" no quede bloqueado.
 */

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Segundos estimados de lectura (~2.5 palabras/s a velocidad normal) + margen. */
export function estimatedSeconds(text: string, rate: number): number {
  const words = text.trim().split(/\s+/).length
  return words / (2.5 * rate) + 2
}

function englishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((voice) => voice.lang === 'en-US') ??
    voices.find((voice) => voice.lang.startsWith('en')) ??
    null
  )
}

/** Lee `text` y llama a `onEnd` una sola vez (al terminar o por tiempo). */
export function speak(text: string, rate: number, onEnd: () => void): () => void {
  let done = false
  const finish = () => {
    if (done) return
    done = true
    clearTimeout(fallback)
    onEnd()
  }
  const fallback = setTimeout(finish, estimatedSeconds(text, rate) * 1000)

  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = rate
  const voice = englishVoice()
  if (voice) utterance.voice = voice
  utterance.onend = finish
  utterance.onerror = finish
  synth.speak(utterance)

  // Para cortar si el componente se desmonta a mitad.
  return () => {
    done = true
    clearTimeout(fallback)
    synth.cancel()
  }
}
