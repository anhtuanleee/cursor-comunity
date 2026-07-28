"use client";

import { cn } from "@/lib/utils";

interface AvatarProps { src?: string | null; name: string; color?: string; size?: "sm" | "md" | "lg"; className?: string; }

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const sizeClasses = { sm: "h-6 w-6 text-[0.625rem]", md: "h-7 w-7 text-[0.6875rem]", lg: "h-8 w-8 text-xs" };

export function Avatar({ src, name, color, size = "md", className }: AvatarProps) {
  if (src) {
    return <img src={src} alt={name} className={cn("rounded-full object-cover flex-shrink-0", sizeClasses[size], className)} />;
  }
  return (
    <div className={cn("rounded-full flex items-center justify-center font-sans font-medium text-white flex-shrink-0", sizeClasses[size], className)}
         style={{ backgroundColor: color || "#5A5A5A" }} title={name}>
      {getInitials(name)}
    </div>
  );
}
