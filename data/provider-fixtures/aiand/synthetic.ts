import type { RequirementExtraction } from "@/lib/providers/aiand.server";

// Deliberately synthetic: this is a deterministic demo fallback, not integration proof.
export const syntheticAiandFixture: RequirementExtraction = {
  category: "laptop",
  summary: "A laptop for development and travel within a moderate budget.",
  requirements: [
    {
      id: "synthetic-max-price",
      criterionKey: "price_sgd",
      label: "Maximum price",
      kind: "mandatory",
      operator: "lte",
      target: 1800,
      unit: "SGD",
      weight: 0,
      source: "ai_extracted",
      needsConfirmation: true,
    },
  ],
  assumptions: ["Budget and memory target are inferred for demo purposes and need confirmation."],
};
