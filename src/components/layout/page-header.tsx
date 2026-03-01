"use client";

import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  rightAction,
}: PageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[#1E1E2E] bg-[#0A0A0F]/90 backdrop-blur-lg"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-lg font-semibold leading-tight text-[#F1F1F3]">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs leading-tight text-[#8888A0]">
              {subtitle}
            </p>
          )}
        </div>
        {rightAction && (
          <div className="ml-3 flex flex-shrink-0 items-center">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
}
