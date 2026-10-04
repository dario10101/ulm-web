/**
 * Datos QUEMADOS para los borradores de "Finance analysis" (todo lo que no
 * es Expenses). Solo sirven para proponer graficos y layout; se reemplazan
 * por la API cuando cada modulo exista en el backend.
 */

export const DRAFT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']

// Hex (no clases) porque LineChart dibuja con `stroke` directo.
export const DRAFT_COLORS = {
  income: '#4ADE80',
  expenses: '#D45A96',
  accent: '#3FA7C4',
  amber: '#FBBF24',
}

export const incomeByMonth = [
  6_200_000, 6_200_000, 7_450_000, 6_200_000, 6_900_000, 9_800_000, 6_350_000, 6_600_000, 7_100_000,
]

export const expensesByMonth = [
  4_900_000, 5_300_000, 5_100_000, 6_050_000, 5_200_000, 7_900_000, 5_600_000, 5_000_000, 5_450_000,
]

export const incomeBySource = [
  {
    key: 'salary',
    label: 'Salary',
    value: 55_800_000,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'freelance',
    label: 'Freelance',
    value: 5_900_000,
    colorClass: 'text-sky-600 dark:text-sky-400',
  },
  {
    key: 'bonus',
    label: 'Bonus',
    value: 3_100_000,
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'interest',
    label: 'Interest',
    value: 1_000_000,
    colorClass: 'text-violet-600 dark:text-violet-400',
  },
]

export const investmentAllocation = [
  {
    key: 'etf',
    label: 'Global ETFs',
    value: 42_000_000,
    colorClass: 'text-sky-600 dark:text-sky-400',
  },
  {
    key: 'cdt',
    label: 'CDT',
    value: 18_000_000,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'pension',
    label: 'Voluntary pension',
    value: 12_500_000,
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'crypto',
    label: 'Crypto',
    value: 4_300_000,
    colorClass: 'text-violet-600 dark:text-violet-400',
  },
  {
    key: 'cash',
    label: 'Cash reserve',
    value: 6_000_000,
    colorClass: 'text-slate-600 dark:text-slate-400',
  },
]

export const portfolioValueByMonth = [
  71_000_000, 72_400_000, 70_900_000, 74_100_000, 76_300_000, 75_800_000, 79_200_000, 81_000_000,
  82_800_000,
]

export const contributionsByMonth = [
  1_000_000, 1_000_000, 1_500_000, 1_000_000, 1_000_000, 2_000_000, 1_000_000, 1_200_000, 1_300_000,
]

export const debts = [
  {
    key: 'mortgage',
    label: 'Mortgage',
    value: 148_000_000,
    meta: '11.2% EA · 17y left',
    colorClass: 'text-sky-600 dark:text-sky-400',
  },
  {
    key: 'car',
    label: 'Car loan',
    value: 21_500_000,
    meta: '14.9% EA · 28m left',
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'card',
    label: 'Credit card',
    value: 3_200_000,
    meta: '28.1% EA · revolving',
    colorClass: 'text-rose-600 dark:text-rose-400',
  },
  {
    key: 'icetex',
    label: 'Student loan',
    value: 6_800_000,
    meta: '9.5% EA · 20m left',
    colorClass: 'text-violet-600 dark:text-violet-400',
  },
]

export const totalDebtByMonth = [
  189_000_000, 187_600_000, 186_400_000, 185_100_000, 183_400_000, 182_900_000, 181_500_000,
  180_300_000, 179_500_000,
]

export const assetsByMonth = [
  298_000_000, 300_500_000, 299_800_000, 304_200_000, 307_900_000, 308_600_000, 313_400_000,
  316_000_000, 318_800_000,
]

export const assetBreakdown = [
  { key: 'home', label: 'Home', value: 210_000_000, colorClass: 'text-sky-600 dark:text-sky-400' },
  {
    key: 'investments',
    label: 'Investments',
    value: 82_800_000,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'vehicle',
    label: 'Vehicle',
    value: 19_000_000,
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'cash',
    label: 'Cash & accounts',
    value: 7_000_000,
    colorClass: 'text-violet-600 dark:text-violet-400',
  },
]

export const aiInsights = [
  {
    tone: 'warning' as const,
    title: 'June spending spiked 41% over your average',
    body: 'Travel and Gifts explain most of it. If it was a one-off, consider a sinking fund so it does not hit a single month.',
  },
  {
    tone: 'good' as const,
    title: 'Savings rate is up to 23% this quarter',
    body: 'Up from 16% in Q1, driven by lower Restaurants spending and the freelance income in March.',
  },
  {
    tone: 'info' as const,
    title: 'Credit card carries the most expensive debt',
    body: 'At 28.1% EA it costs more than your investments return. Paying it off first saves an estimated $ 520.000 this year.',
  },
  {
    tone: 'info' as const,
    title: '3 subscriptions have not been used in 60 days',
    body: 'Tagged as SUBSCRIPTION: streaming, cloud storage and a language app. Together about $ 96.000 / month.',
  },
]
