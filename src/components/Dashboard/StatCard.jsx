import React, { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import Skeleton from "../ui/Skeleton";

/* Variant → tinted card surface, icon chip, accent edge.
   - Light mode: pale variant tint on the card body for a row of personality.
   - Dark mode: clean dark surface (the pale tints turn to washed-out smudges
     on dark, killing readability). Variant identity comes from the icon chip
     and the 3px left edge in both modes. */
const variantStyles = {
  default: {
    cardBg: "bg-surface",
    cardBorder: "border-line",
    chipBg: "bg-subtle",
    chipFg: "text-fg-muted",
    edge: "before:bg-fg-subtle/30",
  },
  accent: {
    cardBg: "bg-accent-soft/45 dark:bg-surface",
    cardBorder: "border-accent-100 dark:border-line",
    chipBg: "bg-accent-soft dark:bg-accent/15",
    chipFg: "text-accent",
    edge: "before:bg-accent",
  },
  success: {
    cardBg: "bg-success-50/55 dark:bg-surface",
    cardBorder: "border-success-100 dark:border-line",
    chipBg: "bg-success-50 dark:bg-success-900/40",
    chipFg: "text-success-700 dark:text-success-300",
    edge: "before:bg-success-500",
  },
  warning: {
    cardBg: "bg-warning-50/55 dark:bg-surface",
    cardBorder: "border-warning-100 dark:border-line",
    chipBg: "bg-warning-50 dark:bg-warning-900/40",
    chipFg: "text-warning-700 dark:text-warning-300",
    edge: "before:bg-warning-500",
  },
  danger: {
    cardBg: "bg-error-50/55 dark:bg-surface",
    cardBorder: "border-error-100 dark:border-line",
    chipBg: "bg-error-50 dark:bg-error-900/40",
    chipFg: "text-error-700 dark:text-error-300",
    edge: "before:bg-error-500",
  },
};

const formatNumber = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-US")
    : n ?? "—";

/* Animated count-up (skips for reduced-motion users) */
const useCountUp = (target) => {
  const [value, setValue] = useState(0);
  const numericTarget = typeof target === "number" ? target : null;

  useEffect(() => {
    if (numericTarget == null) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(numericTarget);
      return;
    }

    const start = performance.now();
    const duration = 700;
    let raf;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out-quart
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(numericTarget * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numericTarget]);

  return numericTarget == null ? target : value;
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  variant = "default",
  trend,        // { value: number, label?: string, direction: 'up' | 'down' | 'flat' }
  loading = false,
  className = "",
}) => {
  const styles = variantStyles[variant] ?? variantStyles.default;
  const animated = useCountUp(value);

  if (loading) {
    return (
      <div className={`${styles.cardBg} border ${styles.cardBorder} rounded-lg p-lg ${className}`}>
        <div className="flex items-start justify-between mb-lg">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-7 w-20 mb-md" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  const TrendIcon =
    trend?.direction === "up"
      ? ArrowUpRight
      : trend?.direction === "down"
      ? ArrowDownRight
      : Minus;

  const trendColor =
    trend?.direction === "up"
      ? "text-success-700"
      : trend?.direction === "down"
      ? "text-error-700"
      : "text-fg-subtle";

  return (
    <div
      className={`group relative overflow-hidden ${styles.cardBg} border ${styles.cardBorder} rounded-lg p-lg
        transition-[border-color,box-shadow] duration-fast
        hover:border-line-strong hover:shadow-sm
        before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] ${styles.edge}
        ${className}`}
    >
      <div className="flex items-start justify-between mb-md">
        <p className="text-eyebrow uppercase text-fg-subtle">{label}</p>
        {Icon && (
          <div
            className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${styles.chipBg} ${styles.chipFg}`}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-sm">
        <span className="text-display text-fg tabular-nums leading-none">
          {formatNumber(animated)}
        </span>
      </div>

      {trend && (
        <div className={`mt-md flex items-center gap-xs text-caption ${trendColor}`}>
          <TrendIcon className="h-3 w-3" aria-hidden />
          <span className="tabular-nums font-medium">
            {trend.value > 0 && trend.direction !== "down" ? "+" : ""}
            {trend.value}%
          </span>
          {trend.label && (
            <span className="text-fg-subtle font-normal">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
