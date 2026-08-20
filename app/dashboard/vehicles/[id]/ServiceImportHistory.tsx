import Link from "next/link";

type ServiceImport = {
  id: string;
  file_name: string;
  status: "processing" | "review" | "failed" | "committed";
  created_at: string;
  extraction_error: string | null;
  source_signed_url: string | null;
  result_count: number;
};

export default function ServiceImportHistory({ vehicleId, imports }: { vehicleId: string; imports: ServiceImport[] }) {
  if (!imports.length) return null;
  return <details className="service-import-history">
    <summary><div><span className="eyebrow">DOCUMENT ACTIVITY</span><strong>Uploaded records</strong></div><span>{imports.length} upload{imports.length === 1 ? "" : "s"}⌄</span></summary>
    <div className="service-import-list">{imports.map((item) => <div className="service-import-row" key={item.id}>
      <div><strong>{item.file_name}</strong><span>{new Date(item.created_at).toLocaleString()} · {item.status === "committed" ? `${item.result_count || 1} record${item.result_count === 1 ? "" : "s"} saved` : item.status}</span>{item.status === "failed" && item.extraction_error && <small>{item.extraction_error}</small>}</div>
      <div className="record-actions">{item.source_signed_url && <a className="button outline compact-button" href={item.source_signed_url} target="_blank" rel="noreferrer">View file</a>}{item.status !== "failed" && <Link className="button outline compact-button" href={`/dashboard/vehicles/${vehicleId}/service/imports/${item.id}`}>{item.status === "review" ? "Continue review" : "View import"}</Link>}</div>
    </div>)}</div>
  </details>;
}
