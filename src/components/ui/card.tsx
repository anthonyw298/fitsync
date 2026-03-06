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
      "glass rounded-2xl",
      "shadow-[0_2px_24px_rgba(0,0,0,0.3),0_0_40px_rgba(167,139,250,0.03)]",
      "transition-all duration-300",
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
      "font-display text-base font-semibold leading-tight tracking-tight text-[#EAEAF0]",
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
      "flex items-center border-t border-white/[0.06] px-5 py-3",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
