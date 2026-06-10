"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches errors thrown in the ROOT layout itself
 * (e.g. auth/DB unreachable before any app chrome renders). It REPLACES the
 * root layout, so it must render its own <html>/<body> and cannot rely on
 * globals.css, Tailwind, fonts, or any app component — everything else may
 * have failed. Hence inline styles only.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "linear-gradient(135deg, #ecfeff 0%, #f0fdfa 50%, #eff6ff 100%)",
          color: "#1e293b",
        }}
      >
        <div
          style={{
            maxWidth: "22rem",
            width: "100%",
            textAlign: "center",
            background: "rgba(255,255,255,0.85)",
            borderRadius: "1rem",
            border: "1px solid rgba(255,255,255,0.8)",
            boxShadow: "0 20px 40px -12px rgba(15,23,42,0.25)",
            padding: "2.5rem 2rem",
          }}
        >
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "1rem",
              background: "#fef2f2",
              border: "1px solid #fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              fontSize: "1.5rem",
            }}
            aria-hidden
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0 0 1.75rem" }}>
            Clear ran into an unexpected problem. Refreshing usually fixes it — if
            it keeps happening, please try again in a few minutes.
          </p>
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "linear-gradient(135deg, #06b6d4, #14b8a6)",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 500,
              padding: "0.75rem 1.25rem",
              borderRadius: "0.75rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 6px 16px -4px rgba(6,182,212,0.4)",
            }}
          >
            ↻ Try again
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: "1.5rem",
                fontSize: "0.6875rem",
                color: "#94a3b8",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
