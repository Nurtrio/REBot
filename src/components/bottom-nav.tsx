"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, Images, FileText, CreditCard } from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/listings/lst_demo_pacific/shoot", label: "Shoot", icon: Camera },
  { href: "/listings/lst_demo_pacific/gallery", label: "Gallery", icon: Images },
  { href: "/listings/lst_demo_pacific/flyer", label: "Flyer", icon: FileText },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function BottomNav() {
  const pathname = usePathname();
  // Hide on shoot camera for immersion? Keep for MVP navigation.
  const hide =
    pathname?.includes("/shoot") && !pathname?.endsWith("/review");

  if (hide) return null;

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-30 w-full max-w-phone -translate-x-1/2 border-t border-line bg-paper-raised/95 backdrop-blur-md"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="flex items-stretch justify-around px-1 py-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname?.startsWith(href + "/");
          // Shoot/gallery/flyer active heuristics
          const isActive =
            href === "/"
              ? pathname === "/"
              : href.includes("/shoot")
                ? pathname?.includes("/shoot")
                : href.includes("/gallery")
                  ? pathname?.includes("/gallery")
                  : href.includes("/flyer")
                    ? pathname?.includes("/flyer") || pathname?.includes("/print")
                    : href === "/billing"
                      ? pathname === "/billing"
                      : active;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 rounded-fw-sm py-1.5 text-[10px] ${
                  isActive ? "text-accent" : "text-muted"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  aria-hidden
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
