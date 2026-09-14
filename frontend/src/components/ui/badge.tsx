import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: string }>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants: Record<string, string> = {
      default: "bg-primary/10 text-primary border-primary/20",
      secondary: "bg-secondary text-secondary-foreground border-secondary",
      destructive: "bg-destructive/10 text-destructive border-destructive/20",
      outline: "text-foreground border-border",
      open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      escalated: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      closed: "bg-muted text-muted-foreground border-border",
      pass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      fail: "bg-red-500/10 text-red-500 border-red-500/20",
      admin: "bg-red-500/10 text-red-500 border-red-500/20",
      doctor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      nurse: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      auditor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
          variants[variant] || variants.default,
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
