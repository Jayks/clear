// Type shim for exifr/dist/lite.esm.js — the lite build doesn't ship its own
// declaration file, but shares the same API surface as the full package.
// We only use the `.gps(file)` method for GPS extraction.

declare module "exifr/dist/lite.esm.js" {
  /** Extract GPS coordinates from a File or Blob. Returns null if no GPS data found. */
  function gps(file: File | Blob): Promise<{ latitude: number; longitude: number } | null>;
  export default { gps };
  export { gps };
}
