export const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.heic,.png,.webp,.pdf,.csv,image/jpeg,image/png,image/webp,image/heic,application/pdf,text/csv";

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  csv: "text/csv",
  heic: "image/heic",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  webp: "image/webp",
};

export function uploadFileDetails(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  const mimeType = MIME_TYPES_BY_EXTENSION[extension];
  return mimeType ? { extension: `.${extension}`, mimeType } : null;
}
