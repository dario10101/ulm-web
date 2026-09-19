import { describe, expect, it } from 'vitest'

import { useLayoutState } from '../src/composables/useLayoutState'

describe('useLayoutState', () => {
  it('abre, cierra y alterna el sidebar', () => {
    const { isSidebarOpen, openSidebar, closeSidebar, toggleSidebar } = useLayoutState()

    closeSidebar()
    expect(isSidebarOpen.value).toBe(false)

    openSidebar()
    expect(isSidebarOpen.value).toBe(true)

    toggleSidebar()
    expect(isSidebarOpen.value).toBe(false)
  })

  it('comparte el mismo estado entre distintas llamadas (singleton)', () => {
    const a = useLayoutState()
    const b = useLayoutState()

    a.openSidebar()
    expect(b.isSidebarOpen.value).toBe(true)

    a.closeSidebar()
  })
})
