import { ImageIcon, ExternalLink } from "lucide-react";
import { getAlbumHostLabel } from "@/lib/trip-memories/host-label";

interface PhotoAlbumCardProps {
  url: string;
}

/**
 * A simple link card that opens the trip's shared photo album in a new tab.
 * Rendered only for trips (not nests, not circles) when photoAlbumUrl is set.
 */
export function PhotoAlbumCard({ url }: PhotoAlbumCardProps) {
  const hostLabel = getAlbumHostLabel(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass rounded-xl p-4 flex items-center gap-3 mb-6 hover:shadow-lg hover:shadow-rose-500/10 transition-all group"
    >
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm shrink-0">
        <ImageIcon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Photo Album</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{hostLabel}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-rose-500 transition-colors shrink-0" />
    </a>
  );
}
