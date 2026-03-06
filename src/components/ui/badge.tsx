"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
    "text-xs font-medium leading-tight whitespace-nowrap",
    "select-none transition-all duration-200",
    "backdrop-blur-sm",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/15 shadow-[0_0_12px_rgba(167,139,250,0.06)]",
        success:
          "bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/15 shadow-[0_0_12px_rgba(52,211,153,0.06)]",
        warning:
          "bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/15 shadow-[0_0_12px_rgba(251,191,36,0.06)]",
        danger:
          "bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/15 shadow-[0_0_12px_rgba(248,113,113,0.06)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
