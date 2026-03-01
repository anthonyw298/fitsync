"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
    "text-xs font-medium leading-tight whitespace-nowrap",
    "select-none transition-colors duration-150",
  ],
  {
    variants: {
      variant: {
        default: "bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/20",
        success: "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/20",
        warning: "bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/20",
        danger: "bg-red-500/15 text-red-400 border border-red-500/20",
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
