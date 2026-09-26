import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mountAdminRoute } from './helpers/adminRouter'

function mountAt(path: string) {
  return mountAdminRoute(path, 'admin-quick-add')
}

// El menu de tipos es el contenedor de los botones de tipo.
function typeMenuClass(wrapper: VueWrapper): string {
  return wrapper.findAll('button')[0].element.parentElement!.className
}

describe('QuickAddPage', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) }),
    ) as unknown as typeof fetch
  })

  it('sin tipo en la URL muestra solo el menu, en grilla', async () => {
    const { wrapper } = await mountAt('/admin/quick-add')

    expect(wrapper.text()).not.toContain('New weight')
    expect(typeMenuClass(wrapper)).toContain('sm:grid-cols-4')
  })

  it('abre el form del tipo indicado en la URL y compacta el menu', async () => {
    const { wrapper } = await mountAt('/admin/quick-add/weight')

    expect(wrapper.text()).toContain('New weight')
    expect(typeMenuClass(wrapper)).toContain('sm:flex-wrap')
  })

  it('al elegir un tipo navega a su ruta', async () => {
    const { wrapper, router } = await mountAt('/admin/quick-add')

    const weightButton = wrapper.findAll('button').find((b) => b.text() === 'Weight')!
    await weightButton.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/admin/quick-add/weight')
    expect(wrapper.text()).toContain('New weight')
  })

  it('redirige al menu si el tipo no existe o no esta implementado', async () => {
    for (const type of ['nope', 'workout']) {
      const { router } = await mountAt(`/admin/quick-add/${type}`)
      expect(router.currentRoute.value.fullPath).toBe('/admin/quick-add')
    }
  })

  it('el link "Add record" del sidebar sigue activo dentro de un tipo', async () => {
    const { wrapper } = await mountAt('/admin/quick-add/expense')

    expect(wrapper.get('[data-test="nav"]').classes()).toContain('is-active')
  })

  it('conserva lo escrito en un form al cambiar de tipo y volver', async () => {
    const { wrapper, router } = await mountAt('/admin/quick-add/weight')
    await wrapper.find('input[type="text"], input[inputmode]').setValue('72.4')

    await router.push('/admin/quick-add/meal')
    await flushPromises()
    await router.push('/admin/quick-add/weight')
    await flushPromises()

    const input = wrapper.find('input[type="text"], input[inputmode]').element as HTMLInputElement
    expect(input.value).toBe('72.4')
  })
})
