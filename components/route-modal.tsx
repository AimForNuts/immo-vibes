"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";

/**
 * Wraps page content in a modal overlay when rendered in the @modal parallel slot.
 * Clicking the backdrop or pressing Escape navigates back.
 */
export function RouteModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const dismiss = useCallback(() => router.back(), [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={dismiss}
      />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
