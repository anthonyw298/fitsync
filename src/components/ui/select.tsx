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
            className="text-sm font-medium text-[#EAEAF0]"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "flex h-10 w-full appearance-none rounded-xl border px-3.5 py-2 pr-10",
              "bg-white/[0.03] backdrop-blur-sm",
              "text-sm text-[#EAEAF0]",
              "transition-all duration-250",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#06060C]",
              error
                ? "border-[#F87171]/40 focus-visible:ring-[#F87171]/40"
                : "border-white/[0.08] focus-visible:ring-[#A78BFA]/40 hover:border-[#A78BFA]/25 hover:bg-white/[0.04]",
              "disabled:cursor-not-allowed disabled:opacity-40",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-[#0E0E18] text-[#6B6B8A]">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-[#0E0E18] text-[#EAEAF0]"
              >
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B8A]"
            aria-hidden
          />
        </div>

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
Select.displayName = "Select";

export { Select };
