export interface Post {
  slug: string
  title: string
  date: string
  excerpt: string
  tags: string[]
  paragraphs: string[]
}

// Contenido de ejemplo, en espanol (el sitio publico esta en espanol).
// Mas adelante esto vendra de ulm-repository (markdown en git).
export const posts: Post[] = [
  {
    slug: 'why-im-building-a-personal-life-os',
    title: 'Por qué estoy construyendo un sistema operativo para mi vida',
    date: '2026-08-02',
    excerpt:
      'Planeo mucho y ejecuto menos de lo que quisiera. Este proyecto es un intento de arreglar eso con algo que controlo yo mismo.',
    tags: ['Proyecto', 'Meta'],
    paragraphs: [
      'Planeo mucho y ejecuto menos de lo que quisiera — un problema conocido para muchos ingenieros. Unified Life Manager nació como respuesta a una pregunta simple: ¿cómo sería una herramienta construida para hacer que realmente haga las cosas, no solo que las registre?',
      'También es una buena excusa para aprender frontend en serio, ya que la mayor parte de mi trabajo es backend y pipelines de datos.',
    ],
  },
  {
    slug: 'notes-on-pyspark-window-functions',
    title: 'Notas sobre funciones de ventana en PySpark',
    date: '2026-07-18',
    excerpt:
      'Algunos patrones que finalmente hicieron que las funciones de ventana me cerraran, anotados antes de que se me olviden.',
    tags: ['Ingeniería de datos', 'PySpark'],
    paragraphs: [
      'Las funciones de ventana son de esas cosas que asustan hasta que dejás de pensarlas como agregaciones y empezás a pensarlas como "una fila, más contexto sobre sus vecinas".',
      'Particionar por la columna equivocada es la forma más común de obtener resultados incorrectos sin que se note — vale la pena revisarlo siempre.',
    ],
  },
  {
    slug: 'kickboxing-as-a-reset-button',
    title: 'El kickboxing como botón de reinicio de un data engineer',
    date: '2026-06-30',
    excerpt:
      'Algunas ideas sobre por qué lo que más me ayuda a concentrarme frente al teclado es justo lo más alejado de uno.',
    tags: ['Personal'],
    paragraphs: [
      'La mayor parte de mi día la paso pensando en abstracciones — esquemas, pipelines, casos borde. El kickboxing obliga a lo contrario: reaccionar a lo que tenés justo enfrente, ahora.',
      'Se convirtió en una de las formas más confiables que tengo para resetear después de un mal día de debugging.',
    ],
  },
]
