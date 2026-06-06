import type { ExpenseLocation, ReceiptItem } from "@/lib/db/schema/expenses";

export type ScanMode = "expense" | "circle" | "stream_evidence";

export interface ParsedReceipt {
  description:  string;
  amount:       number | null;
  currency:     string | null;
  category:     string;
  expenseDate:  string | null; // YYYY-MM-DD
  receiptItems: ReceiptItem[];
  location:     ExpenseLocation | null;
  confidence:   "high" | "medium" | "low";
}

export interface ScanModeConfig {
  showLocationResult:  boolean;
  showItemsResult:     boolean;
  showCategoryResult:  boolean;
  ctaLabel:            string;
  proofToggleLabel:    string;
  proofDisclosure:     string;
}

export const SCAN_MODE_CONFIG: Record<ScanMode, ScanModeConfig> = {
  expense: {
    showLocationResult:  true,
    showItemsResult:     true,
    showCategoryResult:  true,
    ctaLabel:            "Fill form →",
    proofToggleLabel:    "Keep as proof 📎",
    proofDisclosure:     "Stored with a public URL — avoid receipts showing sensitive card details.",
  },
  circle: {
    showLocationResult:  false, // pool draws aren't geographic
    showItemsResult:     false, // single-line wallet expenses
    showCategoryResult:  true,
    ctaLabel:            "Fill form →",
    proofToggleLabel:    "Keep as proof 📎",
    proofDisclosure:     "Stored for admin accountability. Members can view this as evidence of pool spend.",
  },
  stream_evidence: {             // Phase 9 — reserved; design separately
    showLocationResult:  false,
    showItemsResult:     false,
    showCategoryResult:  false,
    ctaLabel:            "Attach to entry →",
    proofToggleLabel:    "Attach as evidence",
    proofDisclosure:     "Stored as evidence for this debt record.",
  },
};

export type { ExpenseLocation, ReceiptItem };
