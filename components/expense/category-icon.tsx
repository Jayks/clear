import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

interface CategoryIconProps {
  category: string;
  size?: "sm" | "md";
}

export function CategoryIcon({ category, size = "md" }: CategoryIconProps) {
  const cat = getCategory(category);
  const Icon = cat.icon;
  return (
    <div className={cn("rounded-xl flex items-center justify-center shrink-0", cat.color,
      size === "sm" ? "w-8 h-8" : "w-10 h-10")}>
      <Icon className={cn(cat.textColor, size === "sm" ? "w-4 h-4" : "w-5 h-5")} />
    </div>
  );
}
