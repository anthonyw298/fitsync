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
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, damping: 30, stiffness: 300 },
  },
  exit: {
    y: "100%",
    transition: { type: "tween" as const, duration: 0.22, ease: "easeIn" as const },
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
              "rounded-t-2xl sm:rounded-2xl",
              "border border-[#1E1E2E] bg-[#13131A]",
              "shadow-[0_-8px_40px_rgba(0,0,0,0.5)]",
              "max-h-[85vh] overflow-y-auto overscroll-contain",
              className
            )}
          >
            {/* Drag handle (mobile affordance) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-[#1E1E2E]" />
            </div>

            {/* Header */}
            {title && (
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1E1E2E] bg-[#13131A] px-5 py-4">
                <h2 className="text-base font-semibold text-[#F1F1F3]">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-[#8888A0] transition-colors hover:bg-[#1E1E2E] hover:text-[#F1F1F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]"
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
                className="absolute right-3 top-3 rounded-lg p-1.5 text-[#8888A0] transition-colors hover:bg-[#1E1E2E] hover:text-[#F1F1F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]"
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
