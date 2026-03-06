"use client";

import type { ReactNode } from "react";
import UserMenu from "./user-menu";

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
      className="sticky top-0 z-40 glass-dense"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Bottom edge gradient line */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex min-w-0 flex-col">
          <h1 className="font-display truncate text-lg font-semibold leading-tight text-[#EAEAF0]">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs leading-tight text-[#6B6B8A]">
              {subtitle}
            </p>
          )}
        </div>
        <div className="ml-3 flex flex-shrink-0 items-center gap-2">
          {rightAction}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
