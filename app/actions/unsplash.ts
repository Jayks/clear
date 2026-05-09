"use server";

import { searchPhotos } from "@/lib/unsplash";

export async function searchUnsplash(query: string) {
  if (!query.trim()) return searchPhotos("travel landscape");
  return searchPhotos(query);
}
