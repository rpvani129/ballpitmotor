export const VEHICLE_ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.csv,.txt,.docx,.xlsx,.wp8';
export const VEHICLE_ATTACHMENT_CATEGORIES = ['Registration', 'Insurance', 'Title', 'Dyno Sheet', 'Setup Guide', 'Technical Document', 'Receipt', 'Photo', 'Other'] as const;
export const VEHICLE_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
const types: Record<string, string> = { wp8: 'application/octet-stream', pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', csv: 'text/csv', txt: 'text/plain', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
export function vehicleAttachmentFileDetails(file: { name: string; size: number }) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return file.size > 0 && file.size <= VEHICLE_ATTACHMENT_MAX_BYTES && types[extension] ? { extension: `.${extension}`, mimeType: types[extension] } : null;
}
