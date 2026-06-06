import { TRIP_CATEGORIES, NEST_CATEGORIES, CIRCLE_CATEGORIES } from "../categories";

type GroupType = "trip" | "nest" | "circle";

/**
 * Cross-type category fallback mappings.
 * Applied when the AI-returned category doesn't exist in the target group type.
 * Outer key = AI category value; inner key = target group type; value = mapped category.
 */
const CROSS_TYPE_MAP: Record<string, Partial<Record<GroupType, string>>> = {
  // Trip-only → other types
  accommodation: { nest: "rent",        circle: "venue"      },
  sightseeing:   { nest: "other",       circle: "activities" },
  shopping:      { nest: "supplies",    circle: "supplies"   },
  tour_package:  { nest: "other",       circle: "other"      },
  // Nest-only → other types
  rent:          { trip: "accommodation", circle: "other"    },
  utilities:     { trip: "other",       circle: "other"      },
  subscriptions: { trip: "other",       circle: "other"      },
  healthcare:    { trip: "other",       circle: "other"      },
  maintenance:   { trip: "other",       circle: "equipment"  },
  // Circle-only → other types
  venue:         { trip: "activities",  nest: "other"        },
  gift:          { trip: "shopping",    nest: "other"        },
  equipment:     { trip: "other",       nest: "supplies"     },
  // Shared but missing in circles
  groceries:     { circle: "supplies"                        },
  // Shared but missing in trips
  supplies:      { trip: "other"                             },
};

/**
 * Maps an AI-returned category to the nearest valid category for the target group type.
 * - If the category exists in the group's category list, returns it unchanged (fast path).
 * - If a cross-type mapping is defined, returns the mapped category.
 * - Falls back to "other" (always valid in every group type).
 */
export function mapToGroupCategory(aiCategory: string, groupType: GroupType): string {
  const cats =
    groupType === "trip"   ? TRIP_CATEGORIES   :
    groupType === "nest"   ? NEST_CATEGORIES   :
    CIRCLE_CATEGORIES;

  const validValues = new Set(cats.map((c) => c.value));

  // Fast path: category is already valid for this group type
  if (validValues.has(aiCategory)) return aiCategory;

  // Cross-type mapping
  const mapped = CROSS_TYPE_MAP[aiCategory]?.[groupType];
  if (mapped && validValues.has(mapped)) return mapped;

  return "other";
}
