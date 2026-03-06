"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  /** Current value (0-100). */
  value: number;
  /** Fill color -- any valid CSS color string. Defaults to violet. */
  color?: string;
  /** Optional label displayed to the left of the bar. */
  label?: string;
  /** Show the percentage number on the right side. */
  showPercentage?: boolean;
  /** Track height. */
  height?: "sm" | "md" | "lg";
  /** Extra class names on the outer wrapper. */
  className?: string;
}

const heightMap: Record<string, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = "#A78BFA",
  label,
  showPercentage = false,
  height = "md",
  className,
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {/* Label row */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <span className="font-medium text-[#EAEAF0]">{label}</span>
          )}
          {showPercentage && (
            <span className="tabular-nums text-[#6B6B8A]">
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-white/[0.06]",
          heightMap[height]
        )}
      >
        {/* Animated fill */}
        <motion.div
          className={cn("h-full rounded-full", heightMap[height])}
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            boxShadow: `0 0 12px ${color}30`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
      </div>
    </div>
  );
};
ProgressBar.displayName = "ProgressBar";

export { ProgressBar };
