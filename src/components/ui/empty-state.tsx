"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: ButtonProps["variant"];
}

export interface EmptyStateProps {
  /** Lucide icon component displayed at the top. */
  icon?: React.ElementType;
  /** Primary heading. */
  title: string;
  /** Secondary description. */
  description?: string;
  /** Optional CTA button rendered below the description. */
  action?: EmptyStateAction;
  /** Extra class names on the wrapper. */
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center px-6 py-16 text-center",
      className
    )}
  >
    {Icon && (
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.06] shadow-[0_0_30px_rgba(167,139,250,0.06)]">
        <Icon className="h-8 w-8 text-[#6B6B8A]" />
      </div>
    )}

    <h3 className="font-display text-base font-semibold text-[#EAEAF0]">{title}</h3>

    {description && (
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-[#6B6B8A]">
        {description}
      </p>
    )}

    {action && (
      <Button
        variant={action.variant ?? "default"}
        size="sm"
        onClick={action.onClick}
        className="mt-5"
      >
        {action.label}
      </Button>
    )}
  </div>
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
