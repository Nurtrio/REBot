"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenHeader, Button, SectionLabel } from "@/components/ui";
import { useAppStore } from "@/store/app-store";

export default function NewListingPage() {
  const router = useRouter();
  const createListing = useAppStore((s) => s.createListing);
  const [form, setForm] = useState({
    address: "",
    city: "",
    state: "CA",
    zip: "",
    beds: 3,
    baths: 2,
    sqft: 1800,
    price: 999000,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address.trim() || !form.zip.trim()) return;
    const id = createListing(form);
    router.push(`/listings/${id}/shoot`);
  }

  const field =
    "w-full rounded-fw-sm border border-line bg-paper-raised px-3 py-2.5 text-sm text-ink outline-none focus:border-ink/40";

  return (
    <main>
      <ScreenHeader title="New listing" subtitle="Address & basics" backHref="/" />
      <form onSubmit={onSubmit} className="space-y-5 px-4 py-5">
        <div>
          <SectionLabel>Property</SectionLabel>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-muted">Street address</span>
            <input
              className={field}
              required
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="742 Pacific Crest Drive"
            />
          </label>
          <div className="grid grid-cols-5 gap-2">
            <label className="col-span-2">
              <span className="mb-1 block text-xs text-muted">City</span>
              <input
                className={field}
                required
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </label>
            <label className="col-span-1">
              <span className="mb-1 block text-xs text-muted">ST</span>
              <input
                className={field}
                required
                maxLength={2}
                value={form.state}
                onChange={(e) => set("state", e.target.value.toUpperCase())}
              />
            </label>
            <label className="col-span-2">
              <span className="mb-1 block text-xs text-muted">ZIP</span>
              <input
                className={field}
                required
                inputMode="numeric"
                value={form.zip}
                onChange={(e) => set("zip", e.target.value)}
              />
            </label>
          </div>
        </div>

        <div>
          <SectionLabel>Facts</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["beds", "Beds", form.beds],
                ["baths", "Baths", form.baths],
                ["sqft", "Sq ft", form.sqft],
                ["price", "List price", form.price],
              ] as const
            ).map(([key, label, val]) => (
              <label key={key}>
                <span className="mb-1 block text-xs text-muted">{label}</span>
                <input
                  className={field}
                  type="number"
                  min={0}
                  value={val}
                  onChange={(e) => set(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted">
          Hero intent: exterior first. You’ll pick rooms on the shoot screen.
        </p>

        <Button type="submit" size="lg">
          Start shoot
        </Button>
      </form>
    </main>
  );
}
