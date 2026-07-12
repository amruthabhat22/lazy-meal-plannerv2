/** Cuisine choices shown in onboarding/Profile. Slugs match the
 * multi-value `cuisines` tags in data/meals.csv. */
export const CUISINES: { slug: string; label: string }[] = [
  { slug: "north-indian", label: "North Indian" },
  { slug: "south-indian", label: "South Indian" },
  { slug: "continental", label: "Continental" },
  { slug: "chinese", label: "Chinese" },
];

/** Older installs may have saved retired slugs — fold them into the
 * current four so preferences keep working. */
const LEGACY_CUISINES: Record<string, string> = {
  american: "continental",
  mediterranean: "continental",
  mexican: "continental",
  italian: "continental",
  asian: "chinese",
  "pan-asian": "chinese",
  tibetan: "chinese",
};

export function normalizeCuisines(slugs: string[]): string[] {
  const valid = new Set(CUISINES.map((c) => c.slug));
  const result: string[] = [];
  for (const slug of slugs) {
    const mapped = LEGACY_CUISINES[slug] ?? slug;
    if (valid.has(mapped) && !result.includes(mapped)) result.push(mapped);
  }
  return result;
}
