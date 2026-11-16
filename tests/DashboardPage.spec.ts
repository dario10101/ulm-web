import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { addDays, formatIsoDate, isoWeekday } from '../src/lib/date'
import type { DashboardPulse, DashboardToday } from '../src/types/dashboard'
import { mountAdminRoute } from './helpers/adminRouter'
import { ME, ME_ALL, mockApi } from './helpers/fetchMock'

const todayIso = formatIsoDate(new Date())

function todayBody(overrides: Partial<DashboardToday> = {}): DashboardToday {
  return {
    date: todayIso,
    events: [
      {
        id: 1,
        name: 'Holiday',
        detail: null,
        code: 'HOLIDAY',
        source: 'event',
        first_day: todayIso,
        last_day: todayIso,
        category_id: null,
      },
    ],
    weight: { last_recorded_on: formatIsoDate(addDays(new Date(), -10)), last_kg: 72.5 },
    english: { last_practice_at: new Date().toISOString() },
    ...overrides,
  }
}

const week = {
  id: 7,
  first_day: formatIsoDate(addDays(new Date(), -3)),
  last_day: formatIsoDate(addDays(new Date(), 3)),
  closed: false,
  closed_date: null,
  score: null,
}

function task(id: number, status: 'PENDING' | 'COMPLETE' = 'PENDING', categoryId = 1) {
  return {
    id,
    name: `Task ${id}`,
    importance: 'STANDARD',
    points: 1,
    category_id: categoryId,
    day_of_week: isoWeekday(),
    status,
    last_modified_date: '2026-11-16T00:00:00',
    detail: null,
  }
}

function todayApi(extra: Record<string, { status: number; body?: unknown }> = {}) {
  return mockApi({
    'GET /dashboard/today': { status: 200, body: todayBody() },
    'GET /checklists/categories': {
      status: 200,
      body: [{ id: 1, name: 'Health', priority: 1, status: 'ENABLED' }],
    },
    'GET /checklists/weeks/current': { status: 200, body: week },
    // La tarea 3 es de una categoria deshabilitada: no se muestra.
    'GET /checklists/weeks/7/tasks': {
      status: 200,
      body: [task(1), task(2), task(3, 'PENDING', 9)],
    },
    'GET /calendar-tasks': { status: 200, body: [] },
    ...extra,
  })
}

const comparison = (current: number | null, previous: number | null, average: number | null) => ({
  current,
  previous,
  average,
})

function pulseBody(overrides: Partial<DashboardPulse> = {}): DashboardPulse {
  return {
    week: {
      first_day: '2026-11-14',
      last_day: '2026-11-20',
      in_progress: true,
      elapsed_days: 5,
      total_days: 7,
    },
    planning: { score_pct: comparison(66.7, 75, 75) },
    finances: {
      spent: comparison(400000, 200000, 60000),
      top_deviation: { label: 'Fun', current: 300000, average: 10000 },
      month_first_day: '2026-11-01',
      month_last_day: '2026-11-18',
      month_income: 1000000,
      month_expenses: 600000,
      savings_rate_pct: 40,
    },
    weight: { average_kg: comparison(71.5, 73, 73) },
    english: { sessions: comparison(1, 1, 0.25) },
    ...overrides,
  }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sin vista en la URL muestra Today y corrige la URL', async () => {
    todayApi()

    const { wrapper, router } = await mountAdminRoute('/admin/dashboard')

    expect(router.currentRoute.value.fullPath).toBe('/admin/dashboard/today')
    expect(wrapper.text()).toContain("Today's tasks")
  })

  it('una vista invalida tambien cae en Today', async () => {
    todayApi()

    const { router } = await mountAdminRoute('/admin/dashboard/nope')

    expect(router.currentRoute.value.fullPath).toBe('/admin/dashboard/today')
  })

  it('el boton Weekly pulse cambia de vista', async () => {
    todayApi({ 'GET /dashboard/pulse': { status: 200, body: pulseBody() } })
    const { wrapper, router } = await mountAdminRoute('/admin/dashboard')

    const button = wrapper.findAll('button').find((b) => b.text() === 'Weekly pulse')!
    await button.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/admin/dashboard/pulse')
    expect(wrapper.text()).toContain('Checklist score')
  })

  describe('Today', () => {
    it('muestra eventos, las tareas de hoy y los recordatorios', async () => {
      todayApi()

      const { wrapper } = await mountAdminRoute('/admin/dashboard/today')

      expect(wrapper.text()).toContain('Holiday')
      const tasks = wrapper.findAll('[data-test="today-task"]')
      expect(tasks.map((t) => t.text())).toEqual([
        expect.stringContaining('Task 1'),
        expect.stringContaining('Task 2'),
      ])
      expect(wrapper.find('[data-test="reminder-weight"]').text()).toContain('10 days ago')
      expect(wrapper.find('[data-test="reminder-english"]').text()).toContain('today')
    })

    it('marca una tarea como completada', async () => {
      const api = todayApi({
        'PATCH /checklists/tasks/1': { status: 200, body: task(1, 'COMPLETE') },
      })
      const { wrapper } = await mountAdminRoute('/admin/dashboard/today')

      await wrapper.find('button[title="Mark completed"]').trigger('click')
      await flushPromises()

      const patch = api.mock.calls.find(([, init]) => init?.method === 'PATCH')!
      expect(patch[0]).toContain('/checklists/tasks/1')
      expect(JSON.parse(String(patch[1]!.body))).toEqual({ status: 'COMPLETE' })
      expect(wrapper.text()).toContain('1/2 done')
    })

    it('sin planning no pide tareas ni muestra su bloque', async () => {
      const api = mockApi({
        'GET /dashboard/today': { status: 200, body: todayBody({ english: null }) },
      })

      const { wrapper } = await mountAdminRoute('/admin/dashboard/today', 'admin-dashboard', {
        ...ME,
        permissions: ['weight'],
      })

      expect(wrapper.text()).not.toContain("Today's tasks")
      expect(api.mock.calls.some(([url]) => String(url).includes('/checklists'))).toBe(false)
      expect(wrapper.find('[data-test="reminder-weight"]').exists()).toBe(true)
    })
  })

  describe('Weekly pulse', () => {
    it('marca la semana en curso con su avance', async () => {
      mockApi({ 'GET /dashboard/pulse': { status: 200, body: pulseBody() } })

      const { wrapper } = await mountAdminRoute('/admin/dashboard/pulse')

      const progress = wrapper.find('[data-test="week-progress"]')
      expect(progress.text()).toContain('In progress')
      expect(progress.text()).toContain('Day 5 of 7')
      expect(progress.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('71')
      expect(wrapper.find('button[title="Next week"]').attributes('disabled')).toBeDefined()
      expect(wrapper.text()).toContain('Biggest rise')
    })

    it('una semana pasada no muestra la barra de avance', async () => {
      mockApi({
        'GET /dashboard/pulse': {
          status: 200,
          body: pulseBody({
            week: {
              first_day: '2026-11-07',
              last_day: '2026-11-13',
              in_progress: false,
              elapsed_days: 7,
              total_days: 7,
            },
          }),
        },
      })

      const { wrapper } = await mountAdminRoute('/admin/dashboard/pulse')

      expect(wrapper.find('[data-test="week-progress"]').exists()).toBe(false)
    })

    it('Interpret lleva la marca de IA y muestra la respuesta', async () => {
      const api = mockApi({
        'GET /dashboard/pulse': { status: 200, body: pulseBody() },
        'POST /dashboard/pulse/interpretation': {
          status: 200,
          body: { text: '- Good week', model: 'gpt-6-luna' },
        },
      })
      const { wrapper } = await mountAdminRoute('/admin/dashboard/pulse')

      const button = wrapper.find('[data-test="interpret"]')
      expect(button.attributes('title')).toBe('Uses AI tokens')
      await button.trigger('click')
      await flushPromises()

      const post = api.mock.calls.find(([, init]) => init?.method === 'POST')!
      expect(JSON.parse(String(post[1]!.body))).toEqual({ week_start: '2026-11-14' })
      expect(wrapper.find('[data-test="interpretation"]').text()).toBe('- Good week')
    })

    it('sin permiso ai no ofrece interpretar', async () => {
      mockApi({ 'GET /dashboard/pulse': { status: 200, body: pulseBody() } })

      const { wrapper } = await mountAdminRoute('/admin/dashboard/pulse', 'admin-dashboard', {
        ...ME_ALL,
        permissions: ME_ALL.permissions.filter((p) => p !== 'ai'),
      })

      expect(wrapper.find('[data-test="interpret"]').exists()).toBe(false)
    })
  })
})
