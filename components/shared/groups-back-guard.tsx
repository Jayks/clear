"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

// Double-back-to-exit (standard Android pattern): 1st back press on Home is
// trapped and shows a toast; a 2nd press within the window lets the exit
// actually proceed. Deliberately does NOT sign the user out — exiting the
// app and ending the session are different things (see CLAUDE.md).
const EXIT_WINDOW_MS = 2000;

export function GroupsBackGuard() {
  const primedRef = useRef(false);
  const selfPopRef = useRef(false); // true while consuming our own chained back()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    window.history.pushState(null, "", "/groups");

    function handlePop() {
      // Our own chained history.back() from the confirmed-exit branch below —
      // let it through untouched (don't re-trap it).
      if (selfPopRef.current) {
        selfPopRef.current = false;
        return;
      }

      if (primedRef.current) {
        // 2nd press within the window — confirm exit. The guard's mount-time
        // pushState sits on top of the real "/groups" history entry from the
        // original navigation, so popping just the guard entry alone would
        // land back on that (still-"/groups") entry with nothing visibly
        // changing. Chain one more back() to consume it too, so the
        // browser's own back action actually proceeds (backgrounds/exits an
        // installed PWA, or navigates back in a normal tab). Known
        // limitation: on the very first back-press of a freshly-opened PWA
        // with zero prior history, this chained call is a no-op (JS can't
        // trigger the native "no history -> close app" fallback that only
        // responds to real hardware back events) — a 3rd press is needed in
        // that specific case.
        primedRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        selfPopRef.current = true;
        window.history.back();
        return;
      }

      // 1st press — trap it, prompt, and arm the exit window.
      window.history.pushState(null, "", "/groups");
      toast("Press back again to exit", {
        id: "groups-exit-toast",
        duration: EXIT_WINDOW_MS,
      });
      primedRef.current = true;
      timerRef.current = setTimeout(() => {
        primedRef.current = false;
      }, EXIT_WINDOW_MS);
    }

    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return null;
}
