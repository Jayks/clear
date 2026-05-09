"use client";

import { useEffect } from "react";

export function useWarnBeforeLeave(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
