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
        "border-b border-[#1E1E2E]",
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
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0A0A0F]",
              "rounded-t-lg",
              isActive
                ? "text-[#F1F1F3]"
                : "text-[#8888A0] hover:text-[#F1F1F3]/80"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{tab.label}</span>

            {/* Active indicator bar */}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#8B5CF6]"
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
