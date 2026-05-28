"use server";

import { searchPhotos } from "@/lib/unsplash";
import { getCurrentUser } from "@/lib/db/queries/auth";

export async function searchUnsplash(query: string) {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!query.trim()) return searchPhotos("travel landscape");
  return searchPhotos(query);
}
