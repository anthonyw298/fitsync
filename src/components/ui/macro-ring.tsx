"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface MacroRingProps {
  /** Current value. */
  value: number;
  /** Maximum value. */
  max: number;
  /** Stroke / ring color (any valid CSS color). */
  color?: string;
  /** Overall size of the ring. */
  size?: "sm" | "md" | "lg";
  /** Label displayed below the value inside the ring. */
  label?: string;
  /** Unit displayed next to the value (e.g. "g", "kcal"). */
  unit?: string;
  /** Extra class names on the wrapper. */
  className?: string;
}

const sizeConfig = {
  sm: { px: 64, stroke: 5, valueClass: "text-sm font-bold", labelClass: "text-[9px]" },
  md: { px: 96, stroke: 6, valueClass: "text-lg font-bold", labelClass: "text-[10px]" },
  lg: { px: 140, stroke: 8, valueClass: "text-2xl font-extrabold", labelClass: "text-xs" },
} as const;

const MacroRing: React.FC<MacroRingProps> = ({
  value,
  max,
  color = "#A78BFA",
  size = "md",
  label,
  unit,
  className,
}) => {
  const { px, stroke, valueClass, labelClass } = sizeConfig[size];
  const radius = (px - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - progress);

  // Generate a unique gradient id for each instance
  const gradientId = React.useId();

  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center justify-center",
        className
      )}
      style={{ width: px, height: px }}
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        className="-rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />

        {/* Animated progress arc */}
        <motion.circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
          style={{ filter: `drop-shadow(0 0 8px ${color}50)` }}
        />
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(valueClass, "font-display tabular-nums text-[#EAEAF0]")}>
          {Math.round(value)}
          {unit && (
            <span className="ml-0.5 text-[0.55em] font-normal text-[#6B6B8A]">
              {unit}
            </span>
          )}
        </span>
        {label && (
          <span className={cn(labelClass, "mt-0.5 font-medium text-[#6B6B8A] uppercase tracking-wider")}>
            {label}
          </span>
        )}
        {max > 0 && (
          <span className={cn(labelClass, "text-[#6B6B8A]/50 tabular-nums")}>
            / {Math.round(max)}
          </span>
        )}
      </div>
    </div>
  );
};
MacroRing.displayName = "MacroRing";

export { MacroRing };
