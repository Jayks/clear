"use client";

import { useEffect } from "react";
import { trackVisit } from "@/app/actions/admin";

const SESSION_KEY = "clear_v_tracked";

export function VisitorTracker() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    trackVisit().catch(() => {});
  }, []);

  return null;
}
