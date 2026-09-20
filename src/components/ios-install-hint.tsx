"use client";

import { useEffect, useState } from "react";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

/** One-time Safari tip: Add to Home Screen for app-like Framewalk */
export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIos() || isStandalone()) return;
    try {
      if (localStorage.getItem("fw_ios_install_dismissed") === "1") return;
    } catch {
      /* ignore */
    }
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 rounded-fw border border-line bg-paper-raised px-3 py-3 text-sm shadow-fw">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">Add Framewalk to your Home Screen</p>
          <p className="mt-1 text-xs text-muted">
            Safari → Share → <span className="font-medium">Add to Home Screen</span>.
            Opens full-screen like an app (camera + leveler work best there).
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs text-faint"
          aria-label="Dismiss"
          onClick={() => {
            try {
              localStorage.setItem("fw_ios_install_dismissed", "1");
            } catch {
              /* ignore */
            }
            setShow(false);
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
