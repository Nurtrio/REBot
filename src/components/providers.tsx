"use client";

import { SoftUpsellChip } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { PLANS } from "@/data/plans";
import { usePathname } from "next/navigation";

export function SoftUpsellHost() {
  const pathname = usePathname();
  const balance = useAppStore((s) => s.balance());
  const monthlyGrant = useAppStore((s) => s.monthlyGrant);
  const planId = useAppStore((s) => s.planId);
  const dismissed = useAppStore((s) => s.softUpsellDismissed);
  const dismiss = useAppStore((s) => s.dismissSoftUpsell);

  if (dismissed) return null;
  if (pathname === "/billing") return null;
  // Soft: at 80% usage → balance ≤ 20% of monthly grant
  if (balance > monthlyGrant * 0.2) return null;

  const next =
    planId === "starter"
      ? PLANS.find((p) => p.id === "pro")
      : planId === "pro"
        ? PLANS.find((p) => p.id === "team")
        : null;

  const message =
    planId === "starter"
      ? "You’re almost through this month’s credits. Pro is $59 and covers ~4–6 listings."
      : planId === "pro"
        ? "You’re almost through this month’s credits. Team pools 900 credits for assistants."
        : "Credits running low. Top up to keep grading.";

  return (
    <div className="fixed bottom-[4.25rem] left-1/2 z-20 w-full max-w-phone -translate-x-1/2">
      <SoftUpsellChip
        message={message}
        cta={next ? `Go ${next.name}` : "Add credits"}
        href="/billing"
        onDismiss={dismiss}
      />
    </div>
  );
}
