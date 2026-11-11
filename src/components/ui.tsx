"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

export const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,20,0.04)] ${className}`}>
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50",
  ghost: "text-neutral-600 hover:bg-neutral-100",
  danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
  dark: "bg-neutral-900 text-white hover:bg-neutral-800",
};

export function Button({
  variant = "primary",
  icon,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: IconName;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "violet";

const badgeTones: Record<BadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/15",
  info: "bg-sky-50 text-sky-700 ring-sky-600/15",
  neutral: "bg-neutral-100 text-neutral-600 ring-neutral-500/15",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/15",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  tone = "emerald",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: IconName;
  trend?: { value: string; up: boolean };
  tone?: "emerald" | "sky" | "amber" | "violet" | "rose";
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-neutral-500">{label}</p>
          <p className="mt-2 text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">{value}</p>
          {sub ? <p className="mt-1 truncate text-xs text-neutral-500">{sub}</p> : null}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
      {trend ? (
        <div className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${trend.up ? "text-emerald-600" : "text-red-600"}`}>
          <Icon name={trend.up ? "trendUp" : "trendDown"} className="h-3.5 w-3.5" />
          {trend.value}
        </div>
      ) : null}
    </Card>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-neutral-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-neutral-200 bg-white shadow-2xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-neutral-500">{description}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Fermer"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-neutral-100 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon = "box",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-neutral-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const color = pct <= 15 ? "bg-red-500" : pct <= 35 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 ${className}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
