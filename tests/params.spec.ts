import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { calendarRows, groupByMonth, missingCount } from '../src/lib/calendarEventsAdmin'
import { withCurrent } from '../src/lib/catalogOptions'
import type { CalendarYear } from '../src/types/params'
import { mountAdminRoute } from './helpers/adminRouter'
import { ME, ME_ALL, mockApi } from './helpers/fetchMock'

const TAG = { id: 1, name: 'NEEDED', color_key: 'emerald', status: 'ENABLED', usage_count: 3 }
const ARCHIVED_TAG = { id: 2, name: 'OLD', color_key: 'red', status: 'DISABLED', usage_count: 1 }

describe('withCurrent', () => {
  it('agrega el item archivado del registro sin duplicar los activos', () => {
    const active = [{ id: 1 }, { id: 2 }]

    expect(withCurrent(active, [{ id: 2 }, { id: 9 }])).toEqual([{ id: 1 }, { id: 2 }, { id: 9 }])
    expect(withCurrent(active, [])).toEqual(active)
  })
})

describe('calendarEventsAdmin', () => {
  const year: CalendarYear = {
    year: 2027,
    country: 'CO',
    events: [
      {
        id: 7,
        code: 'SPECIAL_DATE',
        first_day: '2027-05-09',
        last_day: '2027-05-09',
        name: 'Madre',
        detail: null,
      },
      {
        id: 3,
        code: 'HOLIDAY',
        first_day: '2027-01-01',
        last_day: '2027-01-01',
        name: 'Año nuevo',
        detail: null,
      },
      // Empezo el año anterior: se ubica el 1 de enero.
      {
        id: 9,
        code: 'HOLIDAY',
        first_day: '2026-12-31',
        last_day: '2027-01-02',
        name: 'Puente',
        detail: null,
      },
    ],
    official_holidays: [
      { day: '2027-01-01', name: 'Año Nuevo', event_id: 3 },
      { day: '2027-01-11', name: 'Reyes', event_id: null },
    ],
  }

  it('mezcla eventos y festivos faltantes, ordenados y agrupados por mes', () => {
    const groups = groupByMonth(calendarRows(year))

    expect(groups.map((g) => g.month)).toEqual(['2027-01', '2027-05'])
    expect(groups[0].rows.map((r) => [r.kind, r.day])).toEqual([
      ['event', '2027-01-01'],
      ['event', '2027-01-01'],
      ['missing', '2027-01-11'],
    ])
    const official = calendarRows(year).filter((r) => r.kind === 'event' && r.official)
    expect(official.map((r) => r.key)).toEqual(['event-3'])
    expect(missingCount(year)).toBe(1)
  })
})

describe('paneles de parametros', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('View records -> Income muestra los botones de sus paneles', async () => {
    mockApi({})
    const { wrapper } = await mountAdminRoute('/admin/records/income', 'admin-records')

    const labels = wrapper.findAll('a').map((a) => a.text())
    expect(labels).toEqual(expect.arrayContaining(['Tags', 'Sources', 'Subcategories']))
  })

  it('cada panel tiene su URL y lista los tags (archivados ocultos)', async () => {
    mockApi({ 'GET /finances/tags': { status: 200, body: [TAG, ARCHIVED_TAG] } })
    const { wrapper } = await mountAdminRoute('/admin/records/expense/tags', 'admin-records')

    expect(wrapper.text()).toContain('Expense settings')
    expect(wrapper.text()).toContain('NEEDED')
    expect(wrapper.text()).toContain('Used in 3 records')
    expect(wrapper.text()).not.toContain('OLD')
    expect(wrapper.text()).toContain('Show archived (1)')
  })

  it('un panel que el tipo no tiene vuelve a sus registros', async () => {
    mockApi({})
    const { router } = await mountAdminRoute('/admin/records/expense/sources', 'admin-records')

    expect(router.currentRoute.value.fullPath).toBe('/admin/records/expense')
  })

  it('borrar un tag usado avisa que se archiva y muestra el resultado', async () => {
    const api = mockApi({
      'GET /finances/tags': { status: 200, body: [TAG] },
      'DELETE /finances/tags/1': { status: 200, body: { result: 'ARCHIVED' } },
    })
    const { wrapper } = await mountAdminRoute('/admin/records/expense/tags', 'admin-records')

    await wrapper.find('button[title="Delete NEEDED"]').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').text()).toContain('archived')
    await wrapper
      .findAll('[role="alertdialog"] button')
      .find((b) => b.text() === 'Archive')!
      .trigger('click')
    await flushPromises()

    expect(api).toHaveBeenCalledWith(
      '/api/v1/finances/tags/1',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(wrapper.text()).toContain('"NEEDED" was archived')
  })

  it('Settings oculta las secciones de sistema a quien no es admin', async () => {
    mockApi({})
    const me = { ...ME, permissions: ['finances' as const] }
    const { wrapper, router } = await mountAdminRoute(
      '/admin/settings/payment-methods',
      'admin-settings',
      me,
    )

    expect(router.currentRoute.value.fullPath).toBe('/admin/settings/general')
    expect(wrapper.text()).not.toContain('Payment methods')
  })

  it('el admin abre cada seccion de sistema por URL', async () => {
    mockApi({
      'GET /system/payment-methods': {
        status: 200,
        body: [
          {
            id: 1,
            name: 'Cash',
            icon_key: 'banknote',
            color_key: 'green',
            status: 'ENABLED',
            usage_count: 0,
          },
        ],
      },
    })
    const { wrapper } = await mountAdminRoute(
      '/admin/settings/payment-methods',
      'admin-settings',
      ME_ALL,
    )

    expect(wrapper.text()).toContain('Cash')
    expect(wrapper.text()).toContain('Not used yet')
  })
})
