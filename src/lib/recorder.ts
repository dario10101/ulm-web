/**
 * Grabacion de voz con MediaRecorder (ENGLISH-TEACHER-PLAN.md, C1).
 *
 * No se usa SpeechRecognition del navegador: es el input "que corrige" de los
 * chats, solo existe en Chrome/Edge y manda el audio a Google. Aca se graba el
 * audio y lo transcribe el backend, sin pasarle el texto esperado.
 *
 * Formato: el primero que el navegador soporte. Safari no graba webm, graba
 * mp4; el backend acepta los dos.
 */

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

export type MicrophoneProblem = 'denied' | 'unsupported'

export class MicrophoneError extends Error {
  constructor(public problem: MicrophoneProblem) {
    super(problem)
    this.name = 'MicrophoneError'
  }
}

export interface Recording {
  blob: Blob
  mimeType: string
  seconds: number
}

export interface ActiveRecording {
  /** Detiene y devuelve el audio. */
  stop: () => Promise<Recording>
  /** Descarta (ej. al salir de la pagina a mitad). */
  cancel: () => void
}

export function recordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  )
}

function pickMimeType(): string {
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported?.(type)) ?? ''
}

export async function startRecording(): Promise<ActiveRecording> {
  if (!recordingSupported()) throw new MicrophoneError('unsupported')
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    // NotAllowedError (permiso negado) o NotFoundError (sin microfono): para
    // el usuario es lo mismo, no puede grabar.
    throw new MicrophoneError('denied')
  }

  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  const startedAt = performance.now()
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  recorder.start()

  const release = () => stream.getTracks().forEach((track) => track.stop())

  return {
    stop: () =>
      new Promise<Recording>((resolve) => {
        recorder.onstop = () => {
          release()
          const type = recorder.mimeType || mimeType || 'audio/webm'
          resolve({
            blob: new Blob(chunks, { type }),
            mimeType: type,
            seconds: (performance.now() - startedAt) / 1000,
          })
        }
        recorder.stop()
      }),
    cancel: () => {
      recorder.onstop = null
      if (recorder.state !== 'inactive') recorder.stop()
      release()
    },
  }
}
