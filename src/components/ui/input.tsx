"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional label rendered above the input. */
  label?: string;
  /** Optional helper / error text below the input. */
  helperText?: string;
  /** Mark the input as having an error. */
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, type, id, ...props }, ref) => {
    const inputId = id ?? React.useId();

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#EAEAF0]"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            "flex h-10 w-full rounded-xl border px-3.5 py-2",
            "bg-white/[0.03] backdrop-blur-sm",
            "text-sm text-[#EAEAF0] placeholder:text-[#6B6B8A]/60",
            "transition-all duration-250",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#EAEAF0]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#06060C]",
            error
              ? "border-[#F87171]/40 focus-visible:ring-[#F87171]/40"
              : "border-white/[0.08] focus-visible:ring-[#A78BFA]/40 hover:border-[#A78BFA]/25 hover:bg-white/[0.04]",
            "disabled:cursor-not-allowed disabled:opacity-40",
            className
          )}
          {...props}
        />

        {helperText && (
          <p
            className={cn(
              "text-xs",
              error ? "text-[#F87171]" : "text-[#6B6B8A]"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
