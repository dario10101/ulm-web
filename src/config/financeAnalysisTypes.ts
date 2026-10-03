import {
  ArrowLeftRight,
  Landmark,
  LineChart,
  PiggyBank,
  ReceiptText,
  Sparkles,
  TrendingUp,
} from '@lucide/vue'
import { defineAsyncComponent, type Component } from 'vue'

export interface FinanceAnalysisView {
  id: string
  label: string
}

export interface FinanceAnalysisType {
  id: string
  label: string
  description: string
  icon: Component
  /** Carga diferida: el codigo (y las llamadas) de cada area solo se piden al entrar. */
  component: Component
  /** Sub-analisis (segundo selector). La primera es la de entrada por defecto. */
  views?: FinanceAnalysisView[]
  /** true = datos quemados (borrador de diseño, sin backend). */
  draft: boolean
}

// URL: /admin/analytics/finance/:type/:view? (ver admin.routes.ts).
export const financeAnalysisTypes: FinanceAnalysisType[] = [
  {
    id: 'income',
    label: 'Income',
    icon: TrendingUp,
    description: 'Track how much money comes in over time, by source.',
    component: defineAsyncComponent(
      () => import('@/components/analytics/finance/IncomeAnalysis.vue'),
    ),
    views: [
      { id: 'source', label: 'By source' },
      { id: 'subcategory', label: 'By subcategory' },
      { id: 'tags', label: 'By tags' },
      { id: 'year', label: 'By year' },
      { id: 'month', label: 'By month' },
    ],
    draft: false,
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: ReceiptText,
    description: 'See where your money goes: totals, trends and breakdowns by category.',
    component: defineAsyncComponent(
      () => import('@/components/analytics/finance/ExpensesAnalysis.vue'),
    ),
    views: [
      { id: 'category', label: 'By category' },
      { id: 'tags', label: 'By tags' },
      { id: 'payment-methods', label: 'By payment method' },
      { id: 'month', label: 'By month' },
      { id: 'year', label: 'By year' },
    ],
    draft: false,
  },
  {
    id: 'income-vs-expenses',
    label: 'Income vs expenses',
    icon: ArrowLeftRight,
    description: 'Compare what you earn against what you spend, period over period.',
    component: defineAsyncComponent(
      () => import('@/components/analytics/finance/drafts/IncomeVsExpensesDraft.vue'),
    ),
    draft: true,
  },
  {
    id: 'investments',
    label: 'Investments',
    icon: LineChart,
    description: 'Follow the performance and allocation of your investments.',
    component: defineAsyncComponent(
      () => import('@/components/analytics/finance/drafts/InvestmentsDraft.vue'),
    ),
    draft: true,
  },
  {
    id: 'debts',
    label: 'Debts',
    icon: Landmark,
    description: "Keep an eye on what you owe and how it's trending down (or up).",
    component: defineAsyncComponent(
      () => import('@/components/analytics/finance/drafts/DebtsDraft.vue'),
    ),
    draft: true,
  },
  {
    id: 'net-worth',
    label: 'Net worth',
    icon: PiggyBank,
    description: 'See your total assets minus liabilities over time.',
    component: defineAsyncComponent(
      () => import('@/components/analytics/finance/drafts/NetWorthDraft.vue'),
    ),
    draft: true,
  },
  {
    id: 'ai-analysis',
    label: 'AI analysis',
    icon: Sparkles,
    description: 'Get AI-generated insights and suggestions from your financial data.',
    component: defineAsyncComponent(
      () => import('@/components/analytics/finance/drafts/AiAnalysisDraft.vue'),
    ),
    draft: true,
  },
]
