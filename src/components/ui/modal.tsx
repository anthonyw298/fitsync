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
  const scrollRef = React.useRef<HTMLDivElement>(null);

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

    // Save current scroll position and body styles
    const scrollY = window.scrollY;
    const originalStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      overflow: document.body.style.overflow,
      width: document.body.style.width,
    };

    // Lock the body in place
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";

    return () => {
      // Restore body styles
      document.body.style.position = originalStyles.position;
      document.body.style.top = originalStyles.top;
      document.body.style.left = originalStyles.left;
      document.body.style.right = originalStyles.right;
      document.body.style.overflow = originalStyles.overflow;
      document.body.style.width = originalStyles.width;
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Prevent touch events on the backdrop from scrolling anything
  const handleBackdropTouch = React.useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          style={{ touchAction: "none" }}
        >
          {/* Backdrop – blocks all touch on background */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            onTouchMove={handleBackdropTouch}
            aria-hidden
          />

          {/* Sheet panel */}
          <motion.div
            ref={scrollRef}
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
              "flex flex-col",
              "max-h-[90vh] sm:max-h-[85vh]",
              className
            )}
            style={{
              touchAction: "pan-y",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Drag handle (mobile affordance) */}
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

            {/* Scrollable body */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain p-5"
              style={{
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Bottom safe-area padding for home indicator */}
              <div className="pb-[env(safe-area-inset-bottom,0px)]">
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
Modal.displayName = "Modal";

export { Modal };
