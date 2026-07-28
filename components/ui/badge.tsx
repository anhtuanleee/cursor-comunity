"use client";

import { cn } from "@/lib/utils";

interface BadgeProps { children: React.ReactNode; className?: string; variant?: "default" | "outline"; }

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-badge px-2 py-1 font-sans text-caption font-normal transition-colors duration-150",
      variant === "default" ? "bg-bg-secondary text-primary" : "border border-border-light bg-transparent text-text-secondary",
      className
    )}>
      {children}
    </span>
  );
}
