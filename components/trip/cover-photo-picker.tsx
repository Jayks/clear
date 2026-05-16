"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { searchUnsplash } from "@/app/actions/unsplash";
import { uploadCoverPhoto } from "@/app/actions/upload";
import { toast } from "sonner";
import type { UnsplashPhoto } from "@/lib/unsplash";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageIcon, Search, X, Upload, Loader2 } from "lucide-react";

interface CoverPhotoPickerProps {
  value?: string;
  onChange: (url: string) => void;
}

export function CoverPhotoPicker({ value, onChange }: CoverPhotoPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"search" | "upload">("search");
  const [uploadPending, startUploadTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const results = await searchUnsplash("");
      setPhotos(results);
    });
  }, [open]);

  function handleSearch() {
    startTransition(async () => {
      const results = await searchUnsplash(query);
      setPhotos(results);
    });
  }

  function handleSelect(photo: UnsplashPhoto) {
    onChange(photo.urls.regular);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large (max 5 MB)");
      e.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      e.target.value = "";
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    startUploadTransition(async () => {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await uploadCoverPhoto({
          base64,
          mimeType: file.type,
          fileName: file.name,
        });
        if (result.ok) {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          onChange(result.url);
          setOpen(false);
          setPreviewUrl(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Failed to upload image. Please try again.");
      }
    });
  }

  return (
    <>
      {/* div instead of button — can't nest buttons inside buttons */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        className="w-full h-36 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors overflow-hidden relative group cursor-pointer"
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="text-white text-sm font-medium">Change photo</span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 dark:text-slate-500">
            <ImageIcon className="w-7 h-7" />
            <span className="text-sm">Add cover photo</span>
          </div>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setTab("search");
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }}
      >
        <DialogContent className="glass border-white/70 dark:border-slate-700/60 max-w-2xl p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <h3
              className="text-slate-800 dark:text-slate-100 font-semibold mb-3"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Choose a cover photo
            </h3>
            {/* Tab switcher */}
            <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 mb-3">
              {(["search", "upload"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                    tab === t
                      ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {t === "search" ? "Search Unsplash" : "Upload from device"}
                </button>
              ))}
            </div>
            {tab === "search" && (
              /* No <form> wrapper — avoids bubbling into the parent trip form */
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search landscapes, cities, travel..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isPending}
                  className="px-4 py-2 bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-sm font-medium rounded-lg hover:from-cyan-600 hover:to-teal-600 transition-all disabled:opacity-60"
                >
                  Search
                </button>
              </div>
            )}
          </div>

          <div className="p-4 max-h-[420px] overflow-y-auto">
            {tab === "search" ? (
              <>
                {isPending ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="h-28 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => handleSelect(photo)}
                        className="relative h-28 rounded-lg overflow-hidden hover:ring-2 hover:ring-cyan-500 transition-all group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.urls.small}
                          alt={photo.alt_description ?? ""}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
                {!isPending && photos.length === 0 && (
                  <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-8">
                    No photos found. Try a different search.
                  </p>
                )}
                {photos.length > 0 && (
                  <p className="text-center text-slate-400 dark:text-slate-500 text-xs mt-3">
                    Photos by{" "}
                    <a
                      href="https://unsplash.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Unsplash
                    </a>
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
                {previewUrl ? (
                  <div className="w-full space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-44 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="flex-1 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        Choose another
                      </button>
                      <button
                        type="button"
                        disabled={uploadPending}
                        onClick={handleUpload}
                        className="flex-1 py-2 bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-sm font-medium rounded-lg hover:from-cyan-600 hover:to-teal-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {uploadPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading…
                          </>
                        ) : (
                          "Use this photo"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-44 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500 hover:text-cyan-500 dark:hover:text-cyan-400"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Tap to choose a photo</p>
                      <p className="text-xs mt-0.5">JPEG, PNG, WebP up to 5 MB</p>
                    </div>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
