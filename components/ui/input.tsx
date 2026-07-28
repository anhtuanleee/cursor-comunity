"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { error?: boolean; }

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-8 w-full rounded-input border bg-white px-3 font-sans text-button font-normal text-primary placeholder:text-text-secondary/60 transition-colors duration-150",
        "hover:border-[#A0A0A0] focus:border-black focus:outline-none focus:shadow-[0_0_0_0.1875rem_rgba(0,0,0,0.08)]",
        error ? "border-red-500 focus:border-red-500 focus:shadow-[0_0_0_0.1875rem_rgba(239,68,68,0.10)]" : "border-border-field",
        "disabled:cursor-not-allowed disabled:border-[#E8E8E8] disabled:bg-bg-ghost disabled:text-text-disabled",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
export { Input };
export type { InputProps };
