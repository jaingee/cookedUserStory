import airPurifierFixtures from "@/data/products/air_purifier.json";
import labOvenFixtures from "@/data/products/lab_oven.json";
import laptopFixtures from "@/data/products/laptop.json";
import {
  categoryConfigById,
  categoryConfigs,
} from "@/lib/config/categories";
import {
  productRecordSchema,
  specUnitSchema,
  type DataOrigin,
  type ProductCategory,
  type ProductRecord,
} from "@/lib/contracts";

const fixtureGroups: Record<ProductCategory, readonly unknown[]> = {
  laptop: laptopFixtures,
  air_purifier: airPurifierFixtures,
  lab_oven: labOvenFixtures,
};

const supportedOrigins: ReadonlySet<DataOrigin> = new Set([
  "live_provider",
  "cached_provider",
  "prepared_fixture",
  "synthetic_fixture",
  "local_calculation",
]);

export function validateProductFixtures(value: unknown): ProductRecord[] {
  return productRecordSchema.array().parse(value);
}

export function ensureExactlyThreeProductsPerCategory(
  products: readonly ProductRecord[],
): ProductRecord[] {
  const byCategory = new Map<ProductCategory, ProductRecord[]>();
  const productIds = new Set<string>();

  for (const product of products) {
    if (productIds.has(product.id)) {
      throw new Error(`Duplicate product ID: ${product.id}`);
    }
    productIds.add(product.id);
    const categoryProducts = byCategory.get(product.category) ?? [];
    categoryProducts.push(product);
    byCategory.set(product.category, categoryProducts);
  }

  for (const category of categoryConfigs.map(({ category }) => category)) {
    const count = byCategory.get(category)?.length ?? 0;
    if (count !== 3) {
      throw new Error(`Expected exactly three products for ${category}; received ${count}.`);
    }
  }

  if (byCategory.size !== categoryConfigs.length) {
    throw new Error("Product fixtures contain an unsupported category.");
  }

  return [...products];
}

export function loadAllProductFixtures(): ProductRecord[] {
  const products = validateProductFixtures(Object.values(fixtureGroups).flat());
  rejectInvalidUnits(products);
  return ensureExactlyThreeProductsPerCategory(products);
}

export function loadProductsForCategory(category: ProductCategory): ProductRecord[] {
  const products = validateProductFixtures(fixtureGroups[category]);
  rejectInvalidUnits(products);
  if (products.length !== 3) {
    throw new Error(`Expected exactly three products for ${category}; received ${products.length}.`);
  }
  return products;
}

export function resolveEvidenceReference(
  product: ProductRecord,
  evidenceId: string,
) {
  return product.evidence.find((record) => record.id === evidenceId) ?? null;
}

export function resolveEvidenceReferences(product: ProductRecord, evidenceIds: readonly string[]) {
  return evidenceIds
    .map((evidenceId) => resolveEvidenceReference(product, evidenceId))
    .filter((record): record is ProductRecord["evidence"][number] => record !== null);
}

export function rejectInvalidUnits(value: unknown): ProductRecord[] | ProductRecord {
  const products = Array.isArray(value)
    ? validateProductFixtures(value)
    : [productRecordSchema.parse(value)];

  for (const product of products) {
    const criteriaByKey = new Map(
      categoryConfigById[product.category].criteria.map((criterion) => [criterion.key, criterion]),
    );

    for (const [key, specification] of Object.entries(product.specifications)) {
      if (!specUnitSchema.safeParse(specification.unit).success && specification.unit !== null) {
        throw new Error(`Invalid unit for ${product.id}.${key}.`);
      }
      const criterion = criteriaByKey.get(key);
      if (criterion && specification.unit !== null && specification.unit !== criterion.unit) {
        throw new Error(`Unit mismatch for ${product.id}.${key}: expected ${criterion.unit}.`);
      }
      if (!supportedOrigins.has(specification.origin)) {
        throw new Error(`Unsupported data origin for ${product.id}.${key}.`);
      }
    }
  }

  return Array.isArray(value) ? products : products[0]!;
}

export function identifyMissingOrConflictingValues(product: ProductRecord): {
  missing: string[];
  conflicting: string[];
} {
  const criteria = categoryConfigById[product.category].criteria;
  const missing: string[] = [];
  const conflicting: string[] = [];

  for (const criterion of criteria) {
    const specification = product.specifications[criterion.key];
    if (!specification || specification.claimStatus === "missing" || specification.value === null) {
      missing.push(criterion.key);
      continue;
    }
    if (specification.claimStatus === "conflicting") {
      conflicting.push(criterion.key);
    }
  }

  return { missing, conflicting };
}

export function calculateEvidenceCompleteness(product: ProductRecord): number {
  const specifications = Object.values(product.specifications).filter(
    (specification) => specification.value !== null,
  );
  if (specifications.length === 0) {
    return 0;
  }

  const complete = specifications.filter((specification) => {
    if (specification.claimStatus === "missing" || specification.claimStatus === "conflicting") {
      return false;
    }
    return resolveEvidenceReferences(product, specification.evidenceIds).length > 0;
  });
  return complete.length / specifications.length;
}

