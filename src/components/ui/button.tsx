"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-xl font-semibold transition-all duration-250",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06060C]",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.96]",
    "select-none cursor-pointer",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-to-b from-[#A78BFA] to-[#7C3AED] text-white",
          "hover:from-[#B8A0FB] hover:to-[#8B5CF6]",
          "focus-visible:ring-[#A78BFA]",
          "shadow-[0_2px_16px_rgba(167,139,250,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:shadow-[0_4px_24px_rgba(167,139,250,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]",
        ],
        secondary: [
          "bg-gradient-to-b from-[#38BDF8] to-[#0EA5E9] text-white",
          "hover:from-[#56CCF9] hover:to-[#38BDF8]",
          "focus-visible:ring-[#38BDF8]",
          "shadow-[0_2px_16px_rgba(56,189,248,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:shadow-[0_4px_24px_rgba(56,189,248,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]",
        ],
        destructive: [
          "bg-gradient-to-b from-[#F87171] to-[#DC2626] text-white",
          "hover:from-[#FCA5A5] hover:to-[#EF4444]",
          "focus-visible:ring-[#F87171]",
          "shadow-[0_2px_16px_rgba(248,113,113,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]",
        ],
        outline: [
          "border border-white/[0.08] bg-white/[0.03] text-[#EAEAF0]",
          "hover:bg-white/[0.06] hover:border-[#A78BFA]/30",
          "focus-visible:ring-[#A78BFA]",
          "backdrop-blur-sm",
        ],
        ghost: [
          "bg-transparent text-[#6B6B8A]",
          "hover:bg-white/[0.05] hover:text-[#EAEAF0]",
          "focus-visible:ring-[#A78BFA]",
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
