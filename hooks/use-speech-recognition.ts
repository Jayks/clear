"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Web Speech API types — not yet in all TypeScript DOM lib versions
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: { length: number; [i: number]: { isFinal: boolean; [i: number]: { transcript: string } } };
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

interface UseSpeechRecognitionOptions {
  onFinal: (transcript: string) => void;
}

export interface UseSpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition({
  onFinal,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  // BUGFIX (audit): stop the mic on unmount, not just when the caller's
  // `isOpen` prop flips to false. QuickAddSheet always stays mounted with
  // `isOpen` toggling, so its own effect stops listening on close — but its
  // parents (ExpenseQuickAddFab, GroupActionHub, GlobalFab) DO unmount it on
  // full page navigation. Without this, starting voice input then navigating
  // away via the bottom nav (rather than closing the sheet) left the browser
  // mic listening in the background until SpeechRecognition timed out on its
  // own — a stray onFinalRef call against an unmounted tree, plus a lingering
  // mic indicator and wasted battery.
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!isSupported) return;

    const win = window as unknown as Record<string, SpeechRecognitionConstructor>;
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(final || interim);
      if (final.trim()) {
        onFinalRef.current(final.trim());
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  return { isSupported, isListening, interimTranscript, start, stop };
}
