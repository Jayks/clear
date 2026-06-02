import React from "react";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const W = 1200;
const H = 630;

export function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const amount    = parseFloat(sp.get("amount") ?? "0");
  const currency  = sp.get("currency") ?? "INR";
  const direction = sp.get("direction") ?? "owe"; // "owe" (I pay) | "owed" (I receive)
  const groupName = decodeURIComponent(sp.get("group") ?? "Group");
  const fromName  = decodeURIComponent(sp.get("from")  ?? "Someone");
  const toName    = decodeURIComponent(sp.get("to")    ?? "Someone");

  const isOwe = direction === "owe";

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style:                 "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  // Accent colours — amber (I owe) vs emerald (I'm owed)
  const accent      = isOwe ? "#F59E0B" : "#10B981";
  const accentLight = isOwe ? "#FFFBEB" : "#ECFDF5";
  const accentDark  = isOwe ? "#92400E" : "#065F46";
  const dirLabel    = isOwe ? "YOU OWE" : "YOU'RE OWED";

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width:         W,
          height:        H,
          display:       "flex",
          flexDirection: "column",
          background:    "#FFFFFF",
          fontFamily:    "system-ui, -apple-system, sans-serif",
          position:      "relative",
          overflow:      "hidden",
        },
      },

      // ── Gradient wash ───────────────────────────────────────────────────────
      React.createElement("div", {
        style: {
          position:   "absolute",
          inset:      0,
          background: `linear-gradient(135deg, ${accentLight} 0%, #FFFFFF 55%)`,
        },
      }),

      // ── Top accent bar ──────────────────────────────────────────────────────
      React.createElement("div", {
        style: {
          position:   "absolute",
          top:        0,
          left:       0,
          right:      0,
          height:     6,
          background: `linear-gradient(90deg, #0891B2 0%, #0D9488 50%, ${accent} 100%)`,
        },
      }),

      // ── Main content ────────────────────────────────────────────────────────
      React.createElement(
        "div",
        {
          style: {
            position:      "relative",
            display:       "flex",
            flexDirection: "column",
            padding:       "48px 64px",
            height:        "100%",
          },
        },

        // Header: Clear logo + group name pill
        React.createElement(
          "div",
          {
            style: {
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              marginBottom:   44,
            },
          },
          // Clear logo + wordmark
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 12 } },
            React.createElement(
              "div",
              {
                style: {
                  width:          44,
                  height:         44,
                  borderRadius:   11,
                  background:     "linear-gradient(140deg, #0EA5E9 0%, #0891B2 50%, #0D9488 100%)",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                },
              },
              React.createElement(
                "svg",
                { width: 28, height: 28, viewBox: "0 0 100 100" },
                React.createElement("path", {
                  d:             "M 75 75 A 36 36 0 1 1 75 25",
                  fill:          "none",
                  stroke:        "white",
                  strokeWidth:   "11",
                  strokeLinecap: "round",
                }),
                React.createElement("path", { d: "M 47 35 A 15 15 0 0 0 47 65 Z", fill: "white", fillOpacity: "0.88" }),
                React.createElement("path", { d: "M 53 35 A 15 15 0 0 1 53 65 Z", fill: "white", fillOpacity: "0.88" }),
              ),
            ),
            React.createElement(
              "span",
              { style: { fontSize: 30, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.5px" } },
              "Clear",
            ),
          ),
          // Group name pill
          React.createElement(
            "div",
            {
              style: {
                display:      "flex",
                alignItems:   "center",
                background:   "rgba(15,23,42,0.07)",
                borderRadius: 100,
                padding:      "10px 22px",
              },
            },
            React.createElement(
              "span",
              { style: { fontSize: 20, color: "#475569", fontWeight: 500 } },
              groupName,
            ),
          ),
        ),

        // Direction label pill
        React.createElement(
          "div",
          { style: { display: "flex", marginBottom: 12 } },
          React.createElement(
            "div",
            {
              style: {
                background:   accentLight,
                border:       `1.5px solid ${accent}44`,
                borderRadius: 100,
                padding:      "5px 16px",
                display:      "flex",
                alignItems:   "center",
              },
            },
            React.createElement(
              "span",
              {
                style: {
                  fontSize:      14,
                  fontWeight:    800,
                  color:         accentDark,
                  letterSpacing: "0.12em",
                },
              },
              dirLabel,
            ),
          ),
        ),

        // Big amount
        React.createElement(
          "div",
          {
            style: {
              fontSize:      96,
              fontWeight:    800,
              color:         "#0F172A",
              letterSpacing: "-3px",
              lineHeight:    1,
              marginBottom:  36,
            },
          },
          formattedAmount,
        ),

        // Transfer row: from → to
        React.createElement(
          "div",
          {
            style: {
              display:      "flex",
              alignItems:   "center",
              gap:          18,
              marginBottom: "auto",
            },
          },
          // From pill
          React.createElement(
            "div",
            {
              style: {
                display:      "flex",
                alignItems:   "center",
                gap:          12,
                background:   isOwe ? "rgba(245,158,11,0.1)" : "rgba(15,23,42,0.05)",
                borderRadius: 100,
                padding:      "10px 22px 10px 12px",
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  width:          36,
                  height:         36,
                  borderRadius:   100,
                  background:     "#0891B2",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  color:          "white",
                  fontSize:       15,
                  fontWeight:     700,
                },
              },
              fromName.charAt(0).toUpperCase(),
            ),
            React.createElement(
              "span",
              { style: { fontSize: 22, fontWeight: 600, color: "#1E293B" } },
              fromName,
            ),
          ),
          // Arrow
          React.createElement(
            "span",
            { style: { fontSize: 28, color: "#94A3B8", lineHeight: 1 } },
            "→",
          ),
          // To pill
          React.createElement(
            "div",
            {
              style: {
                display:      "flex",
                alignItems:   "center",
                gap:          12,
                background:   !isOwe ? "rgba(16,185,129,0.1)" : "rgba(15,23,42,0.05)",
                borderRadius: 100,
                padding:      "10px 22px 10px 12px",
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  width:          36,
                  height:         36,
                  borderRadius:   100,
                  background:     "#0D9488",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  color:          "white",
                  fontSize:       15,
                  fontWeight:     700,
                },
              },
              toName.charAt(0).toUpperCase(),
            ),
            React.createElement(
              "span",
              { style: { fontSize: 22, fontWeight: 600, color: "#1E293B" } },
              toName,
            ),
          ),
        ),

        // Footer
        React.createElement(
          "div",
          {
            style: {
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              paddingTop:     22,
              borderTop:      "1.5px solid rgba(15,23,42,0.08)",
              marginTop:      24,
            },
          },
          React.createElement(
            "span",
            { style: { fontSize: 17, color: "#64748B" } },
            "Split smarter with Clear",
          ),
          React.createElement(
            "div",
            {
              style: {
                display:      "flex",
                alignItems:   "center",
                background:   "linear-gradient(135deg, #0891B2, #0D9488)",
                borderRadius: 100,
                padding:      "11px 26px",
              },
            },
            React.createElement(
              "span",
              { style: { fontSize: 17, fontWeight: 700, color: "white" } },
              "Settle on Clear →",
            ),
          ),
        ),
      ),
    ),
    { width: W, height: H },
  );
}
