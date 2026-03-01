"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-xl font-medium transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.97]",
    "select-none",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-[#8B5CF6] text-white",
          "hover:bg-[#7C3AED]",
          "focus-visible:ring-[#8B5CF6]",
          "shadow-[0_0_20px_rgba(139,92,246,0.25)]",
          "hover:shadow-[0_0_28px_rgba(139,92,246,0.35)]",
        ],
        secondary: [
          "bg-[#3B82F6] text-white",
          "hover:bg-[#2563EB]",
          "focus-visible:ring-[#3B82F6]",
          "shadow-[0_0_20px_rgba(59,130,246,0.2)]",
          "hover:shadow-[0_0_28px_rgba(59,130,246,0.3)]",
        ],
        destructive: [
          "bg-red-600 text-white",
          "hover:bg-red-700",
          "focus-visible:ring-red-600",
          "shadow-[0_0_20px_rgba(220,38,38,0.2)]",
        ],
        outline: [
          "border border-[#1E1E2E] bg-transparent text-[#F1F1F3]",
          "hover:bg-[#1E1E2E]/60 hover:border-[#8B5CF6]/40",
          "focus-visible:ring-[#8B5CF6]",
        ],
        ghost: [
          "bg-transparent text-[#8888A0]",
          "hover:bg-[#1E1E2E]/60 hover:text-[#F1F1F3]",
          "focus-visible:ring-[#8B5CF6]",
        ],
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-lg",
        default: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-base rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a child component (e.g. wrapping a Link). */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
