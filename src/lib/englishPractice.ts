/**
 * Logica pura de la practica de ingles (sin Vue): casillas del vocabulario,
 * comparacion de la respuesta y textos de la UI en español o ingles segun el
 * nivel (ENGLISH-TEACHER-PLAN.md, seccion 4: instrucciones en español en A1-A2).
 */

/** Una casilla por letra; los espacios y guiones van fijos (no se escriben). */
export interface LetterSlot {
  fixed: boolean
  char: string
}

export function letterSlots(word: string): LetterSlot[] {
  return [...word].map((char) => ({ fixed: char === ' ' || char === '-', char }))
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export type AnswerResult = 'correct' | 'synonym' | 'wrong'

/**
 * Compara lo escrito con la palabra y sus respuestas aceptadas (ya filtradas
 * por el backend al mismo largo, D30). Un sinonimo cuenta como acierto: la UI
 * muestra cual era la palabra objetivo.
 */
export function checkAnswer(typed: string, lemma: string, accepted: string[]): AnswerResult {
  const value = normalize(typed)
  if (value === normalize(lemma)) return 'correct'
  if (accepted.some((answer) => normalize(answer) === value)) return 'synonym'
  return 'wrong'
}

// --- Textos de la UI ---

export type InstructionsLang = 'es' | 'en'

const TEXTS = {
  en: {
    stepVocabulary: 'Vocabulary',
    stepListening: 'Listening',
    stepWriting: 'Writing',
    stepSpeaking: 'Speaking',
    vocabularyInstruction: 'Write the English word for this picture.',
    verbHint: 'Use the base form of the verb (e.g. "run", not "running").',
    correct: 'Correct!',
    synonym: 'Correct! The word we were looking for is',
    wrong: 'Not quite. Try again.',
    showWord: 'Show word',
    continue: 'Continue',
    listeningInstruction: 'Listen to the sentence. You can play it again.',
    play: 'Play',
    playAgain: 'Play again',
    showText: 'Show text',
    noSpeech: 'Your browser cannot play the audio. Read the text instead.',
    writingInstruction: 'Answer in English.',
    characters: 'characters',
    minimum: 'minimum',
    speakingReadInstruction: 'Press the microphone and read the text aloud.',
    speakingFreeInstruction: 'Keep the conversation going and answer the question out loud:',
    record: 'Record',
    stop: 'Stop',
    recordAgain: 'Record again',
    transcribing: 'Transcribing...',
    match: 'Words read correctly',
    youSaid: 'What we heard',
    secondsLeft: 'seconds left',
    micDenied: 'Microphone access was denied. Allow it in your browser to practice speaking.',
    micUnsupported: 'Your browser cannot record audio.',
    skipSpeaking: 'Skip speaking',
    transcriptionNote:
      'The transcription may "fix" mispronounced words: it shows words, not sounds.',
    closingTitle: 'Practice complete',
    masteredLabel: 'I know this word (do not show it again)',
    masteredRepeat:
      'You already know this word: it came back because you mastered every word of your level.',
    finish: 'Finish for today',
    newPractice: 'New practice',
    feedback: 'Get feedback',
    feedbackLoading: 'Reviewing your practice...',
    feedbackTitle: 'Feedback',
    feedbackWriting: 'Writing',
    feedbackReading: 'Reading aloud',
    feedbackSpeaking: 'Speaking',
    feedbackTips: 'Tips',
    feedbackNoMistakes: 'No mistakes found.',
    answeredQuestion: 'You answered the question.',
    missedQuestion: 'You did not answer the question.',
    saving: 'Saving...',
    suggestUp: 'Your level seems easy for you. Try',
    suggestDown: 'Your level seems hard right now. Try',
    suggestCompleted: 'You mastered every word of your level. Try',
    changeLevel: 'Change level',
    notNow: 'Not now',
  },
  es: {
    stepVocabulary: 'Vocabulario',
    stepListening: 'Escucha',
    stepWriting: 'Escritura',
    stepSpeaking: 'Habla',
    vocabularyInstruction: 'Escribe en inglés la palabra de esta imagen.',
    verbHint: 'Usa el verbo en forma base (ej. "run", no "running").',
    correct: '¡Correcto!',
    synonym: '¡Correcto! La palabra que buscábamos es',
    wrong: 'Casi. Inténtalo de nuevo.',
    showWord: 'Ver la palabra',
    continue: 'Continuar',
    listeningInstruction: 'Escucha la frase. Puedes repetirla.',
    play: 'Escuchar',
    playAgain: 'Escuchar de nuevo',
    showText: 'Ver el texto',
    noSpeech: 'Tu navegador no puede reproducir el audio. Lee el texto.',
    writingInstruction: 'Responde en inglés.',
    characters: 'caracteres',
    minimum: 'mínimo',
    speakingReadInstruction: 'Presiona el micrófono y lee el texto en voz alta.',
    speakingFreeInstruction: 'Continúa la conversación y responde en voz alta la pregunta:',
    record: 'Grabar',
    stop: 'Detener',
    recordAgain: 'Grabar de nuevo',
    transcribing: 'Transcribiendo...',
    match: 'Palabras leídas bien',
    youSaid: 'Lo que escuchamos',
    secondsLeft: 'segundos restantes',
    micDenied:
      'Se negó el acceso al micrófono. Permítelo en el navegador para practicar el speaking.',
    micUnsupported: 'Tu navegador no puede grabar audio.',
    skipSpeaking: 'Saltar el speaking',
    transcriptionNote:
      'La transcripción puede "corregir" palabras mal pronunciadas: muestra palabras, no sonidos.',
    closingTitle: 'Práctica completada',
    masteredLabel: 'Ya conozco esta palabra (no mostrarla más)',
    masteredRepeat: 'Ya conoces esta palabra: volvió porque dominaste todas las de tu nivel.',
    finish: 'Terminar por hoy',
    newPractice: 'Nueva práctica',
    feedback: 'Pedir retroalimentación',
    feedbackLoading: 'Revisando tu práctica...',
    feedbackTitle: 'Retroalimentación',
    feedbackWriting: 'Escritura',
    feedbackReading: 'Lectura en voz alta',
    feedbackSpeaking: 'Habla',
    feedbackTips: 'Consejos',
    feedbackNoMistakes: 'Sin errores.',
    answeredQuestion: 'Respondiste la pregunta.',
    missedQuestion: 'No respondiste la pregunta.',
    saving: 'Guardando...',
    suggestUp: 'Tu nivel parece fácil para ti. Prueba',
    suggestDown: 'Tu nivel parece difícil por ahora. Prueba',
    suggestCompleted: 'Dominaste todas las palabras de tu nivel. Prueba',
    changeLevel: 'Cambiar de nivel',
    notNow: 'Ahora no',
  },
} as const

export type PracticeTexts = { [K in keyof (typeof TEXTS)['en']]: string }

export function practiceTexts(lang: InstructionsLang): PracticeTexts {
  return TEXTS[lang]
}
