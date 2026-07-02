// Verifies the audit fix: useSpeechRecognition now stops the mic on unmount,
// not just when the caller's `isOpen` prop flips to false. QuickAddSheet stays
// mounted with `isOpen` toggling (so its own effect already covers that case),
// but its parents (ExpenseQuickAddFab, GroupActionHub, GlobalFab) unmount it on
// full page navigation — without this fix the mic kept listening in the
// background after navigating away mid-voice-input.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useEffect } from "react";
import { useSpeechRecognition } from "./use-speech-recognition";

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = "";
  onstart: (() => void) | null = null;
  onresult: ((e: unknown) => void) | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }
}

function Harness({ onFinal }: { onFinal: (t: string) => void }) {
  const { start } = useSpeechRecognition({ onFinal });
  useEffect(() => {
    start();
    // start() is stable across renders (isSupported-only dep) — safe to call once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe("useSpeechRecognition — unmount cleanup", () => {
  beforeEach(() => {
    FakeSpeechRecognition.instances = [];
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeSpeechRecognition;
  });

  it("stops the active recognition instance when the component unmounts", () => {
    const { unmount } = render(<Harness onFinal={vi.fn()} />);

    expect(FakeSpeechRecognition.instances).toHaveLength(1);
    const instance = FakeSpeechRecognition.instances[0];
    expect(instance.start).toHaveBeenCalledTimes(1);
    expect(instance.stop).not.toHaveBeenCalled();

    unmount();

    expect(instance.stop).toHaveBeenCalledTimes(1);
  });
});
