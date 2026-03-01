"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  /** Optional label rendered above the select. */
  label?: string;
  /** Optional helper / error text below the select. */
  helperText?: string;
  /** Mark the select as having an error. */
  error?: boolean;
  /** A placeholder option shown when nothing is selected. */
  placeholder?: string;
  /** The list of options. */
  options: SelectOption[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      placeholder,
      options,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id ?? React.useId();

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-[#F1F1F3]"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "flex h-10 w-full appearance-none rounded-xl border bg-[#13131A] px-3.5 py-2 pr-10",
              "text-sm text-[#F1F1F3]",
              "transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0A0A0F]",
              error
                ? "border-red-500/60 focus-visible:ring-red-500/50"
                : "border-[#1E1E2E] focus-visible:ring-[#8B5CF6]/50 hover:border-[#8B5CF6]/30",
              "disabled:cursor-not-allowed disabled:opacity-40",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-[#13131A] text-[#8888A0]">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-[#13131A] text-[#F1F1F3]"
              >
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom chevron icon */}
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8888A0]"
            aria-hidden
          />
        </div>

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
Select.displayName = "Select";

export { Select };
