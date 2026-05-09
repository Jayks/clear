import {
  Utensils,
  Hotel,
  Car,
  Camera,
  ShoppingBag,
  Ticket,
  ShoppingCart,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Category {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;       // tailwind bg color class
  textColor: string;   // tailwind text color class
}

export const CATEGORIES: Category[] = [
  { value: "food",          label: "Food & Drink",    icon: Utensils,      color: "bg-orange-100",  textColor: "text-orange-600" },
  { value: "accommodation", label: "Accommodation",   icon: Hotel,         color: "bg-blue-100",    textColor: "text-blue-600"   },
  { value: "transport",     label: "Transport",       icon: Car,           color: "bg-purple-100",  textColor: "text-purple-600" },
  { value: "sightseeing",   label: "Sightseeing",     icon: Camera,        color: "bg-teal-100",    textColor: "text-teal-600"   },
  { value: "shopping",      label: "Shopping",        icon: ShoppingBag,   color: "bg-pink-100",    textColor: "text-pink-600"   },
  { value: "activities",    label: "Activities",      icon: Ticket,        color: "bg-green-100",   textColor: "text-green-600"  },
  { value: "groceries",     label: "Groceries",       icon: ShoppingCart,  color: "bg-lime-100",    textColor: "text-lime-600"   },
  { value: "other",         label: "Other",           icon: MoreHorizontal,color: "bg-slate-100",   textColor: "text-slate-500"  },
];

export function getCategory(value: string): Category {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

// Hex colors for charts (mirrors the tailwind text colors above)
export const CATEGORY_HEX: Record<string, string> = {
  food:          "#EA580C",
  accommodation: "#2563EB",
  transport:     "#9333EA",
  sightseeing:   "#0D9488",
  shopping:      "#DB2777",
  activities:    "#16A34A",
  groceries:     "#65A30D",
  other:         "#64748B",
};
