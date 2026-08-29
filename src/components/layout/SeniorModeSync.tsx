"use client";

import { useEffect } from "react";

export function SeniorModeSync({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-senior-mode", String(enabled));
  }, [enabled]);
  return null;
}
