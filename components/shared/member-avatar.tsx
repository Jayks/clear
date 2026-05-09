import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-cyan-400 to-teal-500",
  "from-blue-400 to-indigo-500",
  "from-purple-400 to-pink-500",
  "from-orange-400 to-red-500",
  "from-emerald-400 to-green-500",
  "from-teal-400 to-cyan-600",
  "from-indigo-400 to-purple-500",
  "from-pink-400 to-rose-500",
];

function hashName(name: string): number {
  return name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface MemberAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MemberAvatar({ name, size = "md", className }: MemberAvatarProps) {
  const gradient = GRADIENTS[hashName(name) % GRADIENTS.length];
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 text-white font-semibold",
        gradient,
        size === "sm" && "w-7 h-7 text-[10px]",
        size === "md" && "w-9 h-9 text-sm",
        size === "lg" && "w-11 h-11 text-base",
        className
      )}
    >
      {initials}
    </div>
  );
}
