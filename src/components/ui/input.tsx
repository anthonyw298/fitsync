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
            className="text-sm font-medium text-[#F1F1F3]"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            "flex h-10 w-full rounded-xl border bg-[#13131A] px-3.5 py-2",
            "text-sm text-[#F1F1F3] placeholder:text-[#8888A0]/60",
            "transition-all duration-200",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#F1F1F3]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0A0A0F]",
            error
              ? "border-red-500/60 focus-visible:ring-red-500/50"
              : "border-[#1E1E2E] focus-visible:ring-[#8B5CF6]/50 hover:border-[#8B5CF6]/30",
            "disabled:cursor-not-allowed disabled:opacity-40",
            className
          )}
          {...props}
        />

        {helperText && (
          <p
            className={cn(
              "text-xs",
              error ? "text-red-400" : "text-[#8888A0]"
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
