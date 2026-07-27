"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-[#FCFCFC] hover:bg-black active:bg-[#0a0a0a] active:opacity-90 disabled:bg-[#E5E5E5] disabled:text-[#A0A0A0]",
  secondary: "bg-bg-tertiary text-black/50 hover:bg-[#E5E5E5] hover:text-black active:bg-[#DCDCDC] disabled:bg-bg-secondary disabled:text-[#CCCCCC]",
  ghost: "bg-transparent text-text-primary border border-border-light hover:bg-bg-ghost hover:border-[#D0D0D0] active:bg-bg-tertiary active:border-[#C0C0C0]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-sans text-[13px] font-normal leading-[19.5px] rounded-btn transition-colors duration-150",
        size === "md" ? "h-7 px-3" : "h-6 px-2 text-xs",
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
