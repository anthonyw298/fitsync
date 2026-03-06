"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  /** Optional Lucide icon component (rendered at 16 px). */
  icon?: React.ElementType;
}

export interface TabsProps {
  /** List of tab definitions. */
  tabs: TabItem[];
  /** Currently active tab id. */
  activeTab: string;
  /** Called when the user selects a different tab. */
  onChange: (tabId: string) => void;
  /** Extra class names on the outer container. */
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Scroll the active tab into view when it changes
  React.useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector(
      `[data-tab-id="${activeTab}"]`
    ) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex w-full gap-1 overflow-x-auto scrollbar-none",
        "border-b border-white/[0.06]",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            data-tab-id={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm font-medium",
              "transition-all duration-250",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA] focus-visible:ring-offset-1 focus-visible:ring-offset-[#06060C]",
              "rounded-t-lg",
              isActive
                ? "text-[#EAEAF0]"
                : "text-[#6B6B8A] hover:text-[#EAEAF0]/80"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{tab.label}</span>

            {/* Active indicator bar */}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-gradient-to-r from-[#A78BFA] to-[#38BDF8]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
Tabs.displayName = "Tabs";

export { Tabs };
