import type { ClaimExtraction } from "@/lib/providers/doubleword.server";

// Deliberately synthetic: this is a deterministic demo fallback, not integration proof.
export const syntheticDoublewordFixture: ClaimExtraction = {
  productId: "laptop-one",
  claims: [
    {
      criterionKey: "ram_gb",
      value: 16,
      unit: "GB",
      claimStatus: "user_supplied",
      evidenceText: "Synthetic demo claim: 16 GB RAM.",
    },
  ],
  warnings: ["Synthetic fixture; no live Doubleword claim was used."],
};
