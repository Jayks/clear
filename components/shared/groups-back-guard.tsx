"use client";
import { useEffect } from "react";

export function GroupsBackGuard() {
  useEffect(() => {
    window.history.pushState(null, "", "/groups");
    function handlePop() {
      window.history.pushState(null, "", "/groups");
    }
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);
  return null;
}
