import { MapPin, Home } from "lucide-react";
import { TRIP_CATEGORIES, NEST_CATEGORIES } from "./categories";

export const GROUP_CONFIG = {
  trip: {
    labels: {
      singular: "Trip",
      plural: "Trips",
      members: "Members",
      newGroup: "New trip",
      noGroups: "No trips yet",
      noGroupsDesc: "Create your first trip and invite your travel companions. Expenses and settlements follow.",
      createFirst: "Plan your first trip",
    },
    icon: MapPin,
    showDates: true,
    showItinerary: true,
    showNarrative: true,
    showAdherence: true,
    showRecurring: false,
    showBudget: true,
    categories: TRIP_CATEGORIES,
  },
  nest: {
    labels: {
      singular: "Nest",
      plural: "Nests",
      members: "Housemates",
      newGroup: "New nest",
      noGroups: "No nests yet",
      noGroupsDesc: "Create a household group and split expenses with your housemates.",
      createFirst: "Create your first nest",
    },
    icon: Home,
    showDates: false,
    showItinerary: false,
    showNarrative: false,
    showAdherence: false,
    showRecurring: true,
    showBudget: false,
    categories: NEST_CATEGORIES,
  },
} as const;

export type GroupType = keyof typeof GROUP_CONFIG;
export type GroupConfig = (typeof GROUP_CONFIG)[GroupType];

export function getGroupConfig(type: string): GroupConfig {
  return GROUP_CONFIG[type as GroupType] ?? GROUP_CONFIG.trip;
}
