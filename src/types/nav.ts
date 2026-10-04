import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import type { PermissionRequirement } from '@/config/permissions'

export interface NavItem {
  label: string
  to: RouteLocationRaw
  icon: Component
  // Sin permiso, el item no se muestra (ver SidebarNav).
  permission?: PermissionRequirement
}
