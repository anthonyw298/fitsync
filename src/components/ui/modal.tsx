"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  /** Whether the modal is visible. */
  isOpen: boolean;
  /** Called when the user wants to close the modal (backdrop click, X, or Escape). */
  onClose: () => void;
  /** Optional title rendered at the top of the sheet. */
  title?: string;
  /** Content rendered inside the sheet body. */
  children: React.ReactNode;
  /** Extra class names on the sheet panel. */
  className?: string;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const sheetVariants = {
  hidden: { y: "100%", opacity: 0.5 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, damping: 32, stiffness: 340 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { type: "tween" as const, duration: 0.2, ease: "easeIn" as const },
  },
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  React.useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            aria-hidden
          />

          {/* Sheet panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Modal"}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "relative z-10 w-full max-w-lg",
              "rounded-t-3xl sm:rounded-3xl",
              "glass-dense",
              "shadow-[0_-8px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(167,139,250,0.04)]",
              "max-h-[85vh] overflow-y-auto overscroll-contain",
              className
            )}
          >
            {/* Drag handle (mobile affordance) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-white/10" />
            </div>

            {/* Header */}
            {title && (
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] glass-dense px-5 py-4">
                <h2 className="font-display text-base font-semibold text-[#EAEAF0]">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-1.5 text-[#6B6B8A] transition-all duration-200 hover:bg-white/[0.06] hover:text-[#EAEAF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Close button when there is no title */}
            {!title && (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-20 rounded-xl p-1.5 text-[#6B6B8A] transition-all duration-200 hover:bg-white/[0.06] hover:text-[#EAEAF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* Body */}
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
Modal.displayName = "Modal";

export { Modal };
