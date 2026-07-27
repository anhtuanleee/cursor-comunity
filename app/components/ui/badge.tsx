"use client";

import { cn } from "@/lib/utils";

interface BadgeProps { children: React.ReactNode; className?: string; variant?: "default" | "outline"; }

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center font-sans text-[13px] leading-[19.5px] font-normal h-7 px-3 rounded-btn transition-colors duration-150",
      variant === "default" ? "bg-bg-tertiary text-black/50" : "bg-transparent text-text-secondary border border-border-light",
      className
    )}>
      {children}
    </span>
  );
}
