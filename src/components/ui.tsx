"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export function CreditPill({
  balance,
  href = "/billing",
}: {
  balance: number;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink shadow-fw"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
      {balance} credits
    </Link>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(
  function Button(
    { variant = "primary", size = "md", className = "", disabled, ...props },
    ref
  ) {
    const base =
      "inline-flex items-center justify-center gap-2 font-medium transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
    const sizes = {
      sm: "h-9 px-3 text-sm rounded-fw-sm",
      md: "h-11 px-4 text-sm rounded-fw",
      lg: "h-12 px-5 text-base rounded-fw w-full",
    };
    const variants = {
      primary: "bg-ink text-paper-raised hover:bg-ink-soft",
      secondary:
        "bg-paper-raised text-ink border border-line-strong hover:bg-accent-soft/40",
      ghost: "bg-transparent text-ink-soft hover:bg-line/60",
      danger: "bg-danger text-white hover:opacity-90",
    };
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);

export function ScreenHeader({
  title,
  subtitle,
  backHref,
  right,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3">
        {backHref ? (
          <Link
            href={backHref}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft hover:bg-line/50"
            aria-label="Back"
          >
            ←
          </Link>
        ) : (
          <div className="w-9" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl leading-tight text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">{right}</div>
      </div>
    </header>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-faint">
      {children}
    </p>
  );
}

export function ConfirmCost({
  cost,
  balance,
  label = "This will cost",
}: {
  cost: number;
  balance: number;
  label?: string;
}) {
  const ok = balance >= cost;
  return (
    <div
      className={`rounded-fw border px-3 py-2.5 text-sm ${
        ok
          ? "border-line bg-paper-raised text-ink-soft"
          : "border-danger/30 bg-danger-soft text-danger"
      }`}
    >
      <span className="text-muted">{label} </span>
      <strong className="text-ink">{cost} credit{cost === 1 ? "" : "s"}</strong>
      <span className="text-muted"> · {balance} left</span>
      {!ok ? <p className="mt-1 text-xs">Not enough credits.</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="fw-card px-5 py-8 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SoftUpsellChip({
  message,
  cta,
  href,
  onDismiss,
}: {
  message: string;
  cta: string;
  href: string;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-4 mb-3 flex items-start gap-3 rounded-fw border border-accent/25 bg-accent-soft px-3 py-2.5 text-sm text-ink-soft">
      <p className="flex-1 leading-snug">{message}</p>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Link href={href} className="font-medium text-accent hover:underline">
          {cta}
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-muted hover:text-ink"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

/** Room thumb — live capture data URL when present, else abstract gradient */
export function PhotoThumb({
  thumbKey,
  dataUrl,
  graded,
  selected,
  className = "",
}: {
  thumbKey: string;
  dataUrl?: string;
  graded?: boolean;
  selected?: boolean;
  className?: string;
}) {
  const src = dataUrl && dataUrl.startsWith("data:") ? dataUrl : undefined;
  const hue =
    Math.abs(
      thumbKey.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
    ) % 40;
  const base = graded ? 28 + hue : 42 + hue;
  return (
    <div
      className={`relative overflow-hidden bg-[#2a2824] ${className}`}
      style={
        src
          ? undefined
          : {
              background: graded
                ? `linear-gradient(145deg, hsl(${28 + hue} 22% ${base}%) 0%, hsl(${18 + hue} 18% 22%) 100%)`
                : `linear-gradient(160deg, hsl(${36 + hue} 12% ${base}%) 0%, hsl(${24 + hue} 10% 18%) 100%)`,
            }
      }
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${graded ? "contrast-110 saturate-110" : ""}`}
        />
      ) : (
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(255,255,255,.25), transparent 50%)",
          }}
        />
      )}
      {selected ? (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] text-paper">
          ✓
        </span>
      ) : null}
      {graded ? (
        <span className="absolute bottom-1.5 left-1.5 rounded bg-level/90 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">
          Graded
        </span>
      ) : null}
    </div>
  );
}
