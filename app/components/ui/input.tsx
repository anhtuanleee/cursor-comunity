"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { error?: boolean; }

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-input border bg-white px-3 font-sans text-[13px] leading-[19.5px] text-text-primary placeholder:text-[#A0A0A0] transition-colors duration-150",
        "focus:outline-none focus:border-[#5A5A5A] focus:shadow-[0_0_0_2px_rgba(0,0,0,0.1)]",
        error ? "border-[#FF4444] focus:border-[#FF4444] focus:shadow-[0_0_0_2px_rgba(255,68,68,0.1)]" : "border-border-light",
        "disabled:bg-bg-secondary disabled:text-text-disabled disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
export { Input };
export type { InputProps };
