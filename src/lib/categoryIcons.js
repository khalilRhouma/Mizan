import { createElement } from 'react'
import {
  ArrowLeftRight,
  Briefcase,
  Car,
  CircleEllipsis,
  Gamepad2,
  Gift,
  HandHeart,
  HardHat,
  HeartPulse,
  House,
  Package,
  Shirt,
  ShoppingBasket,
  TrendingUp,
  Zap,
} from 'lucide-react'

// One line icon per category. Unknown categories get a neutral icon.
const ICONS = {
  salary: Briefcase,
  extra_income: Gift,
  rent: House,
  bills: Zap,
  food: ShoppingBasket,
  clothes: Shirt,
  health: HeartPulse,
  needs: Package,
  donations: HandHeart,
  leisure: Gamepad2,
  car: Car,
  construction: HardHat,
  investment_project: TrendingUp,
  extra_expense: CircleEllipsis,
  cash_withdrawal: ArrowLeftRight,
}

// Renders the icon for a category (a lookup, not a new component per render).
export function CategoryIcon({ category, ...props }) {
  return createElement(ICONS[category] ?? CircleEllipsis, props)
}
