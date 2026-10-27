import React from "react";

export type BadgeVariant =
  | "matched"
  | "underpaid"
  | "overpaid"
  | "unrecorded"
  | "planned"
  | "checked_in"
  | "completed"
  | "open"
  | "approved"
  | "rejected"
  | "construction"
  | "campus"
  | "neutral";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; border: string; dot?: string }> = {
  matched: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  underpaid: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-300",
    dot: "bg-amber-500",
  },
  overpaid: {
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  unrecorded: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    dot: "bg-slate-400",
  },
  planned: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  checked_in: {
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
    dot: "bg-indigo-600 animate-pulse",
  },
  completed: {
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-300",
    dot: "bg-slate-600",
  },
  open: {
    bg: "bg-sky-50",
    text: "text-sky-900",
    border: "border-sky-300",
    dot: "bg-sky-500 animate-pulse",
  },
  approved: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-300",
    dot: "bg-emerald-600",
  },
  rejected: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  construction: {
    bg: "bg-amber-100",
    text: "text-amber-950",
    border: "border-amber-300",
    dot: "bg-amber-700",
  },
  campus: {
    bg: "bg-teal-50",
    text: "text-teal-900",
    border: "border-teal-300",
    dot: "bg-teal-600",
  },
  neutral: {
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-200",
    dot: "bg-slate-500",
  },
};

export function Badge({ variant, children, size = "md", className = "" }: BadgeProps) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs sm:text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} ${className}`}
    >
      {styles.dot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />}
      {children}
    </span>
  );
}
