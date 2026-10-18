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
    closingTitle: 'Practice complete',
    masteredLabel: 'I know this word (do not show it again)',
    masteredRepeat:
      'You already know this word: it came back because you mastered every word of your level.',
    finish: 'Finish for today',
    newPractice: 'New practice',
    feedback: 'Get feedback',
    saving: 'Saving...',
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
    closingTitle: 'Práctica completada',
    masteredLabel: 'Ya conozco esta palabra (no mostrarla más)',
    masteredRepeat: 'Ya conoces esta palabra: volvió porque dominaste todas las de tu nivel.',
    finish: 'Terminar por hoy',
    newPractice: 'Nueva práctica',
    feedback: 'Pedir retroalimentación',
    saving: 'Guardando...',
  },
} as const

export type PracticeTexts = { [K in keyof (typeof TEXTS)['en']]: string }

export function practiceTexts(lang: InstructionsLang): PracticeTexts {
  return TEXTS[lang]
}
