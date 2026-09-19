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
    path: 'quick-add',
    name: 'admin-quick-add',
    component: () => import('@/views/admin/QuickAddPage.vue'),
  },
  {
    path: 'records',
    name: 'admin-records',
    component: () => import('@/views/admin/RecordsPage.vue'),
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
    path: 'calendar',
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
    meta: {
      hasFilters: true,
      filterLabels: ['Last 30 days', 'Last 90 days', 'This year', 'Finance', 'Health', 'Habits'],
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
