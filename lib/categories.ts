import {
  Utensils, Hotel, Car, Camera, ShoppingBag, Ticket, ShoppingCart, MoreHorizontal,
  Home, Zap, CreditCard, Heart, Wrench, Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Category {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
  textColor: string;
}

export const TRIP_CATEGORIES: Category[] = [
  { value: "food",          label: "Food & Drink",  icon: Utensils,      color: "bg-orange-100 dark:bg-orange-900/30",  textColor: "text-orange-600 dark:text-orange-400" },
  { value: "accommodation", label: "Accommodation", icon: Hotel,         color: "bg-blue-100 dark:bg-blue-900/30",      textColor: "text-blue-600 dark:text-blue-400"   },
  { value: "transport",     label: "Transport",     icon: Car,           color: "bg-purple-100 dark:bg-purple-900/30",  textColor: "text-purple-600 dark:text-purple-400" },
  { value: "sightseeing",   label: "Sightseeing",   icon: Camera,        color: "bg-teal-100 dark:bg-teal-900/30",      textColor: "text-teal-600 dark:text-teal-400"   },
  { value: "shopping",      label: "Shopping",      icon: ShoppingBag,   color: "bg-pink-100 dark:bg-pink-900/30",      textColor: "text-pink-600 dark:text-pink-400"   },
  { value: "activities",    label: "Activities",    icon: Ticket,        color: "bg-green-100 dark:bg-green-900/30",    textColor: "text-green-600 dark:text-green-400" },
  { value: "groceries",     label: "Groceries",     icon: ShoppingCart,  color: "bg-lime-100 dark:bg-lime-900/30",      textColor: "text-lime-600 dark:text-lime-400"   },
  { value: "other",         label: "Other",         icon: MoreHorizontal,color: "bg-slate-100 dark:bg-slate-700",       textColor: "text-slate-500 dark:text-slate-400" },
];

export const NEST_CATEGORIES: Category[] = [
  { value: "rent",          label: "Rent",          icon: Home,          color: "bg-blue-100 dark:bg-blue-900/30",      textColor: "text-blue-600 dark:text-blue-400"   },
  { value: "utilities",     label: "Utilities",     icon: Zap,           color: "bg-yellow-100 dark:bg-yellow-900/30",  textColor: "text-yellow-600 dark:text-yellow-400" },
  { value: "groceries",     label: "Groceries",     icon: ShoppingCart,  color: "bg-lime-100 dark:bg-lime-900/30",      textColor: "text-lime-600 dark:text-lime-400"   },
  { value: "subscriptions", label: "Subscriptions", icon: CreditCard,    color: "bg-purple-100 dark:bg-purple-900/30",  textColor: "text-purple-600 dark:text-purple-400" },
  { value: "food",          label: "Food & Drink",  icon: Utensils,      color: "bg-orange-100 dark:bg-orange-900/30",  textColor: "text-orange-600 dark:text-orange-400" },
  { value: "healthcare",    label: "Healthcare",    icon: Heart,         color: "bg-red-100 dark:bg-red-900/30",        textColor: "text-red-600 dark:text-red-400"     },
  { value: "maintenance",   label: "Maintenance",   icon: Wrench,        color: "bg-orange-100 dark:bg-orange-900/30",  textColor: "text-orange-600 dark:text-orange-400" },
  { value: "supplies",      label: "Supplies",      icon: Package,       color: "bg-teal-100 dark:bg-teal-900/30",      textColor: "text-teal-600 dark:text-teal-400"   },
  { value: "other",         label: "Other",         icon: MoreHorizontal,color: "bg-slate-100 dark:bg-slate-700",       textColor: "text-slate-500 dark:text-slate-400" },
];

// All categories merged — used by getCategory() for display of historical data
const ALL_CATEGORIES = [...TRIP_CATEGORIES, ...NEST_CATEGORIES];

export function getCategory(value: string): Category {
  return ALL_CATEGORIES.find((c) => c.value === value) ?? ALL_CATEGORIES[ALL_CATEGORIES.length - 1];
}

// Hex colors for charts
export const CATEGORY_HEX: Record<string, string> = {
  food:          "#EA580C",
  accommodation: "#2563EB",
  transport:     "#9333EA",
  sightseeing:   "#0D9488",
  shopping:      "#DB2777",
  activities:    "#16A34A",
  groceries:     "#65A30D",
  rent:          "#2563EB",
  utilities:     "#CA8A04",
  subscriptions: "#9333EA",
  healthcare:    "#DC2626",
  maintenance:   "#EA580C",
  supplies:      "#0D9488",
  other:         "#64748B",
};

// Legacy export — components that haven't migrated yet
export const CATEGORIES = TRIP_CATEGORIES;
