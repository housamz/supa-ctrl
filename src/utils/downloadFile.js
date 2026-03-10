/**
 * Trigger a client-side download for the provided content.
 */
export function downloadFile(content, filename, mime = "text/plain") {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([content], { type: mime })),
    download: filename,
  });
  a.click();
}

