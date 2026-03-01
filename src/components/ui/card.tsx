"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-[#1E1E2E] bg-[#13131A]/80 backdrop-blur-md",
      "shadow-[0_0_24px_rgba(139,92,246,0.04)]",
      "transition-colors duration-200",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

/* -------------------------------------------------------------------------- */
/*  CardHeader                                                                */
/* -------------------------------------------------------------------------- */

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5 pb-0", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

/* -------------------------------------------------------------------------- */
/*  CardTitle                                                                 */
/* -------------------------------------------------------------------------- */

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base font-semibold leading-tight tracking-tight text-[#F1F1F3]",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/* -------------------------------------------------------------------------- */
/*  CardContent                                                               */
/* -------------------------------------------------------------------------- */

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

/* -------------------------------------------------------------------------- */
/*  CardFooter                                                                */
/* -------------------------------------------------------------------------- */

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center border-t border-[#1E1E2E] px-5 py-3",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
