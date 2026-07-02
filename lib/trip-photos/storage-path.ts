/** Validates that a storage path belongs to the declared group (prevents cross-group injection). */
export function isValidStoragePath(storagePath: string, groupId: string): boolean {
  return storagePath.startsWith(`${groupId}/`) && storagePath.length > groupId.length + 1;
}
