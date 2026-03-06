"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
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

  // Lock body scroll while open – iOS-safe approach
  React.useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const orig = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      overflow: document.body.style.overflow,
      width: document.body.style.width,
    };

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";

    return () => {
      document.body.style.position = orig.position;
      document.body.style.top = orig.top;
      document.body.style.left = orig.left;
      document.body.style.right = orig.right;
      document.body.style.overflow = orig.overflow;
      document.body.style.width = orig.width;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full-screen backdrop – touch-action:none blocks background scroll */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            style={{ touchAction: "none" }}
            aria-hidden
          />

          {/* Sheet – sits above backdrop, allows its own scrolling */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Modal"}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[101] mx-auto w-full max-w-lg",
              "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
              "rounded-t-3xl sm:rounded-3xl",
              "glass-dense",
              "shadow-[0_-8px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(167,139,250,0.04)]",
              "flex flex-col",
              "max-h-[92vh] sm:max-h-[85vh]",
              className
            )}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-0 sm:hidden shrink-0">
              <div className="h-1 w-10 rounded-full bg-white/10" />
            </div>

            {/* Header */}
            {title && (
              <div className="shrink-0 flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
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

            {/* Close button when no title */}
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

            {/* Scrollable body – NOT a child of the touch-action:none backdrop */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-5"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {children}
              {/* Extra space so last button is never stuck behind screen edge */}
              <div className="h-12" />
              <div className="h-[env(safe-area-inset-bottom,0px)]" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
Modal.displayName = "Modal";

export { Modal };
