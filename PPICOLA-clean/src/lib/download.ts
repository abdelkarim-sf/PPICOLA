import { uid } from "./files";

/** True even for cross-origin, sandboxed frames where accessing top may throw. */
export function isEmbedded(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

/** Trigger a download. Browsers do not expose a reliable success callback. */
export function saveBlob(blob: Blob, filename: string): boolean {
  let url: string | undefined;
  let a: HTMLAnchorElement | undefined;
  try {
    url = URL.createObjectURL(blob);
    a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    return true;
  } catch {
    return false;
  } finally {
    a?.remove();
    // Browsers may start reading the URL after the click handler has returned.
    if (url) {
      const objectUrl = url;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    }
  }
}

/** Only expose file sharing when this browser actually supports this file. */
export function shareableFile(blob: Blob, filename: string): File | null {
  try {
    if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return null;
    const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
    return navigator.canShare({ files: [file] }) ? file : null;
  } catch { return null; }
}

export async function saveBytes(data: Uint8Array | ArrayBuffer, filename: string, type = "application/pdf") {
  const blob = new Blob([data as BlobPart], { type });
  await saveBlob(blob, filename);
}

export type ZipEntry = { name: string; blob: Blob };

/** Build a ZIP from entries and save it. Returns the blob so callers can show its size. */
export async function saveZip(entries: ZipEntry[], zipName: string): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const e of entries) {
    zip.file(e.name, e.blob);
  }
  const blob = await zip.generateAsync(
    { type: "blob", compression: "STORE", streamFiles: true },
    () => {}
  );
  await saveBlob(blob, zipName);
  return blob;
}

/** Build a ZIP blob without saving (for size display). */
export async function makeZip(entries: ZipEntry[], onProgress?: (pct: number) => void): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const e of entries) zip.file(e.name, e.blob);
  return zip.generateAsync({ type: "blob", compression: "STORE", streamFiles: true }, (meta) =>
    onProgress?.(meta.percent)
  );
}

export function objectUrlFor(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revoke(url?: string | null) {
  if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function tempName(prefix: string, ext: string): string {
  return `${prefix}-${uid().slice(0, 8)}.${ext}`;
}
