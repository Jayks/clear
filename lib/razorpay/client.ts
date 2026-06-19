/**
 * Razorpay REST API client — plain `fetch`, no `razorpay` npm package (D8:
 * matches the Resend gotcha, the SDK's transitive deps crash the Turbopack
 * worker). I/O — not unit-tested; exercised via manual/E2E testing against
 * Razorpay's test mode (RAZORPAY_PLAN.md §12).
 *
 * Reads credentials from `process.env` inside each function body, never at
 * module scope (Anthropic SDK gotcha — module-level eval can run before env
 * vars are loaded).
 */

import type { RazorpayNotes } from "./order-notes";
import { getRazorpayMode, getRazorpayKeyId, getRazorpayKeySecret } from "./credentials";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function authHeader(): string {
  const mode = getRazorpayMode();
  const keyId = getRazorpayKeyId(mode);
  const keySecret = getRazorpayKeySecret(mode);
  if (!keyId || !keySecret) throw new Error(`Razorpay ${mode} credentials are not configured`);
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  status: string;
  notes: RazorpayNotes;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  notes: RazorpayNotes;
}

async function razorpayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Razorpay API ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function createOrder(params: {
  amountPaise: number;
  receipt: string;
  notes: RazorpayNotes;
}): Promise<RazorpayOrder> {
  return razorpayFetch<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes,
    }),
  });
}

export async function fetchOrder(orderId: string): Promise<RazorpayOrder> {
  return razorpayFetch<RazorpayOrder>(`/orders/${orderId}`);
}

export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  return razorpayFetch<RazorpayPayment>(`/payments/${paymentId}`);
}
