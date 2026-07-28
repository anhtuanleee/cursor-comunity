"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}

const variants: Record<ButtonVariant, string> = {
  primary: "border border-transparent bg-primary text-bg-elevated hover:bg-black active:bg-black active:shadow-inner disabled:bg-[#E5E5E5] disabled:text-text-disabled",
  secondary: "border border-transparent bg-bg-tertiary text-primary/50 hover:bg-[#E8E8E8] hover:text-primary active:bg-[#E0E0E0] disabled:bg-bg-secondary disabled:text-text-disabled",
  ghost: "border border-transparent bg-transparent text-primary hover:bg-bg-secondary hover:text-black active:text-text-secondary",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-btn font-sans text-button font-normal transition-[background-color,color,box-shadow,opacity,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
        size === "md" ? "h-7 px-3" : "h-6 px-2 text-caption",
        variants[variant],
        "disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps, ButtonVariant };
