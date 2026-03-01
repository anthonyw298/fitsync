"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  UtensilsCrossed,
  Dumbbell,
  Moon,
  MessageCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/" },
  { label: "Food", icon: UtensilsCrossed, path: "/food" },
  { label: "Workout", icon: Dumbbell, path: "/workout" },
  { label: "Sleep", icon: Moon, path: "/sleep" },
  { label: "Chat", icon: MessageCircle, path: "/chat" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1E1E2E] bg-[#13131A]/80 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex h-[70px] max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? pathname === "/"
              : pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2"
            >
              <div className="relative flex items-center justify-center">
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -inset-2 rounded-xl bg-[#8B5CF6]/15"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}
                <Icon
                  size={22}
                  className={`relative transition-colors duration-200 ${
                    isActive
                      ? "text-[#8B5CF6]"
                      : "text-[#8888A0]"
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  fill={isActive ? "rgba(139, 92, 246, 0.2)" : "none"}
                />
              </div>
              <span
                className={`text-[10px] font-medium leading-none transition-colors duration-200 ${
                  isActive ? "text-[#8B5CF6]" : "text-[#8888A0]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
