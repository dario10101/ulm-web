import { beforeEach, describe, expect, it, vi } from 'vitest'

// El modulo guarda estado al importarse (preferencia leida de localStorage):
// cada test lo reimporta limpio.
async function loadTheme(stored: string | null, systemDark: boolean) {
  vi.resetModules()
  localStorage.clear()
  if (stored) localStorage.setItem('ulm-theme', stored)
  window.matchMedia = vi.fn(() => ({
    matches: systemDark,
    addEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
  document.documentElement.classList.remove('dark')
  return import('../src/composables/useTheme')
}

describe('useTheme', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sin preferencia guardada sigue al sistema', async () => {
    const { installTheme, useTheme } = await loadTheme(null, true)
    installTheme()

    expect(useTheme().preference.value).toBe('system')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('la preferencia manual gana sobre el sistema y se guarda', async () => {
    const { installTheme, useTheme } = await loadTheme(null, true)
    installTheme()

    useTheme().setPreference('light')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('ulm-theme')).toBe('light')
  })

  it('lee la preferencia guardada e ignora valores invalidos', async () => {
    let theme = await loadTheme('dark', false)
    theme.installTheme()
    expect(theme.useTheme().resolved.value).toBe('dark')

    theme = await loadTheme('purple', false)
    expect(theme.useTheme().preference.value).toBe('system')
    expect(theme.useTheme().resolved.value).toBe('light')
  })
})
