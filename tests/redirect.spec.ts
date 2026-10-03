import { describe, expect, it } from 'vitest'

import { safeAdminPath } from '../src/lib/redirect'

describe('safeAdminPath', () => {
  it.each([
    '/admin',
    '/admin/records/weight',
    '/admin?x=1',
    '/admin/calendar/week?date=2026-10-01',
  ])('acepta %s', (path) => {
    expect(safeAdminPath(path)).toBe(path)
  })

  it.each([
    'https://evil.example/admin',
    '//evil.example',
    '/admin//evil.example',
    '/admin\\evil',
    '/administrator',
    '/blog',
    '',
    undefined,
    ['/admin'],
  ])('rechaza %s', (value) => {
    expect(safeAdminPath(value)).toBeNull()
  })
})
