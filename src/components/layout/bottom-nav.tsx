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

  // Hide nav on login/signup page
  if (pathname === "/login") return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass-dense"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Top edge gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A78BFA]/20 to-transparent" />

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
                    className="absolute -inset-2.5 rounded-2xl bg-[#A78BFA]/10 shadow-[0_0_16px_rgba(167,139,250,0.1)]"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}
                <Icon
                  size={22}
                  className={`relative transition-all duration-250 ${
                    isActive
                      ? "text-[#A78BFA]"
                      : "text-[#6B6B8A]"
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  fill={isActive ? "rgba(167, 139, 250, 0.15)" : "none"}
                />
              </div>
              <span
                className={`text-[10px] font-medium leading-none transition-all duration-250 ${
                  isActive ? "text-[#A78BFA]" : "text-[#6B6B8A]"
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
