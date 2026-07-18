import { categoryConfigById } from "@/lib/config/categories";
import type { CategoryConfig, ClaimStatus, DataOrigin, ProductCategory, ProviderName } from "@/lib/contracts";

export const providerLabels: Record<ProviderName, string> = {
  aiand: "AI&",
  oxylabs: "Oxylabs",
  doubleword: "Doubleword",
  daytona: "Daytona",
  nosana: "Nosana",
};

export const categoryLabels: Record<ProductCategory, string> = {
  laptop: "Laptop",
  air_purifier: "Air purifier",
  lab_oven: "Lab oven",
};

export const criteriaForCategory = (category: ProductCategory): CategoryConfig => categoryConfigById[category];
export const claimLabel = (claimStatus: ClaimStatus) => claimStatus.replaceAll("_", " ");
export const originLabel = (origin: DataOrigin | null) => origin === null ? "Unavailable" : origin.replace("_", " ");
export const confidenceLabel = (confidence: "high" | "medium" | "low") => `${confidence} confidence`;
