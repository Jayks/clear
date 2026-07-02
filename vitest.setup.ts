import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount any React Testing Library trees after each test so effect cleanup
// (the exact behavior several of these regression tests exist to verify) runs
// between tests instead of leaking into the next one.
afterEach(() => {
  cleanup();
});
