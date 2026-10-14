-- Preserve native dyno backups as binary downloads.
update storage.buckets set allowed_mime_types = array_append(allowed_mime_types, 'application/octet-stream') where id = 'vehicle-attachments' and not ('application/octet-stream' = any(allowed_mime_types));
