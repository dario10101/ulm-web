import type { RouteRecordRaw } from 'vue-router'

// Rutas privadas (app shell con sidebar + topbar). Sin auth real todavia:
// se navegan libremente, ya se protegeran cuando exista login de verdad.
export const adminRoutes: RouteRecordRaw[] = [
  { path: '', redirect: { name: 'admin-dashboard' } },
  {
    path: 'dashboard',
    name: 'admin-dashboard',
    component: () => import('@/views/admin/DashboardPage.vue'),
  },
  {
    // Cada tipo tiene su URL (/admin/quick-add/expense...): se puede enlazar
    // directo, y el boton "atras" del navegador vuelve al menu de tipos.
    path: 'quick-add/:type?',
    name: 'admin-quick-add',
    component: () => import('@/views/admin/QuickAddPage.vue'),
    meta: { managesOwnScroll: true },
  },
  {
    // Igual que quick-add: cada tipo tiene su URL (/admin/records/meal...).
    path: 'records/:type?',
    name: 'admin-records',
    component: () => import('@/views/admin/RecordsPage.vue'),
    meta: { managesOwnScroll: true },
  },
  {
    path: 'checklists',
    name: 'admin-checklists',
    component: () => import('@/views/admin/ChecklistsPage.vue'),
    meta: { hasFilters: true, filterLabels: ['Today', 'This week', 'Health', 'Work', 'Personal'] },
  },
  {
    path: 'checklists/categories',
    name: 'admin-checklists-categories',
    component: () => import('@/views/admin/checklists/CategoriesAdminPage.vue'),
  },
  {
    path: 'checklists/template',
    name: 'admin-checklists-template',
    component: () => import('@/views/admin/checklists/TemplateAdminPage.vue'),
  },
  {
    // Igual que quick-add: cada vista tiene su URL (/admin/calendar/daily...).
    path: 'calendar/:view?',
    name: 'admin-calendar',
    component: () => import('@/views/admin/CalendarPage.vue'),
    meta: { hasFilters: true, filterLabels: ['Habits', 'Tasks', 'Study', 'Finance'] },
  },
  {
    path: 'learning',
    name: 'admin-learning',
    component: () => import('@/views/admin/LearningPage.vue'),
  },
  {
    path: 'analytics',
    name: 'admin-analytics',
    component: () => import('@/views/admin/AnalyticsPage.vue'),
  },
  {
    // Cada area y sub-analisis tiene su URL (/admin/analytics/finance/expenses/month),
    // igual patron que quick-add/:type y records/:type.
    path: 'analytics/finance/:type?/:view?',
    name: 'admin-analytics-finance',
    component: () => import('@/views/admin/analytics/FinanceAnalysisPage.vue'),
  },
  {
    path: 'analytics/checklists',
    name: 'admin-analytics-checklists',
    component: () => import('@/views/admin/analytics/ChecklistScoreTrendsPage.vue'),
    meta: {
      hasFilters: true,
      filterLabels: ['Last 30 days', 'Last 90 days', 'This year'],
    },
  },
  {
    path: 'settings',
    name: 'admin-settings',
    component: () => import('@/views/admin/SettingsPage.vue'),
  },
  {
    path: 'help',
    name: 'admin-help',
    component: () => import('@/views/admin/HelpPage.vue'),
  },
]
