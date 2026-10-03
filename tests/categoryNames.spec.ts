import { describe, expect, it } from 'vitest'

import { categoryNameProblem } from '../src/lib/categoryNames'
import type { Category } from '../src/types/checklist'

function category(id: number, name: string, status: Category['status'] = 'ENABLED'): Category {
  return { id, name, priority: id, status }
}

describe('categoryNameProblem', () => {
  it('acepta nombres distintos', () => {
    expect(categoryNameProblem([{ name: 'Salud' }, { name: 'Trabajo' }], [], [])).toBeNull()
  })

  it('rechaza un nombre repetido sin distinguir mayusculas', () => {
    const problem = categoryNameProblem([{ name: 'Salud' }, { name: 'SALUD' }], [], [])
    expect(problem).toContain('more than once')
  })

  it('rechaza el nombre de una categoria deshabilitada', () => {
    const problem = categoryNameProblem([{ name: 'salud' }], [category(9, 'Salud', 'DISABLED')], [])
    expect(problem).toContain('Re-enable')
  })

  it('rechaza el nombre de una categoria que este guardado quita', () => {
    const problem = categoryNameProblem([{ name: 'Salud' }], [], [category(4, 'Salud')])
    expect(problem).toContain("you're removing")
  })

  it('permite cambiar solo mayusculas de la misma categoria', () => {
    // La categoria sigue en items (mismo id), asi que no esta en removed.
    expect(categoryNameProblem([{ id: 4, name: 'SALUD' }], [], [])).toBeNull()
  })
})
