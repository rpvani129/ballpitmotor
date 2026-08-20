export type ExtractedServiceItem = { category: string; title: string; details: string | null; quantity: string | null; line_amount: number | null; source_item_number: string | null; status: string; confidence: number };
export type ExtractedServiceRecord = { service_date: string | null; category: string; title: string; description: string | null; odometer_miles: number | null; vendor: string | null; cost: number | null; invoice_number: string | null; confidence: number; warnings: string[]; items: ExtractedServiceItem[] };
export type ExtractedServiceDocument = { warnings: string[]; records: ExtractedServiceRecord[] };

const nullable = (type: "string" | "number") => ({ anyOf: [{ type }, { type: "null" }] });
const recordSchema = {
  type: "object", additionalProperties: false,
  required: ["service_date","category","title","description","odometer_miles","vendor","cost","invoice_number","confidence","warnings","items"],
  properties: {
    service_date: nullable("string"), category: { type: "string" }, title: { type: "string" }, description: nullable("string"),
    odometer_miles: nullable("number"), vendor: nullable("string"), cost: nullable("number"), invoice_number: nullable("string"),
    confidence: { type: "number" }, warnings: { type: "array", items: { type: "string" } },
    items: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["category","title","details","quantity","line_amount","source_item_number","status","confidence"],
      properties: { category: { type: "string" }, title: { type: "string" }, details: nullable("string"), quantity: nullable("string"), line_amount: nullable("number"), source_item_number: nullable("string"), status: { type: "string" }, confidence: { type: "number" } }
    }}
  }
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["warnings", "records"],
  properties: {
    warnings: { type: "array", items: { type: "string" } },
    records: { type: "array", minItems: 1, maxItems: 20, items: recordSchema },
  },
};

export function normalizeExtractedServiceDocument(value: unknown): ExtractedServiceDocument {
  const candidate = value as Partial<ExtractedServiceDocument & ExtractedServiceRecord> | null;
  if (candidate && Array.isArray(candidate.records)) {
    return { warnings: Array.isArray(candidate.warnings) ? candidate.warnings : [], records: candidate.records };
  }
  return { warnings: [], records: [value as ExtractedServiceRecord] };
}

export function friendlyExtractionError(status: number, message?: string) {
  if (status === 429 || /quota|billing|credit/i.test(message ?? "")) return "Document reading credits are unavailable. Check the OpenAI API billing balance, then try the upload again.";
  if (status === 413 || /too large|maximum context|token limit/i.test(message ?? "")) return "The document is too large to read at once. Split it into smaller files and upload each part separately.";
  if (status === 400 || /invalid|unsupported|could not process/i.test(message ?? "")) return "The document format could not be read. Try a clearer PDF, JPG, PNG, or WebP file.";
  if (status >= 500) return "The document reader is temporarily unavailable. Try the same file again in a few minutes.";
  return "The document could not be read. Try a clearer scan or enter the service record manually.";
}

export async function extractServiceRecord(bytes: ArrayBuffer, mimeType: string, fileName: string, vehicle: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const base64 = Buffer.from(bytes).toString("base64");
  const fileContent = mimeType === "application/pdf"
    ? { type: "input_file", filename: fileName, file_data: `data:${mimeType};base64,${base64}`, detail: "high" }
    : { type: "input_image", image_url: `data:${mimeType};base64,${base64}`, detail: "high" };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_SERVICE_RECORD_MODEL || "gpt-5.4-mini",
      input: [{ role: "user", content: [
        { type: "input_text", text: `Extract this vehicle service document for ${vehicle}. Return one service record for each distinct repair order, invoice, or service date represented in the complete document. A multi-page invoice is normally one record, while a combined scan containing separate invoices should produce multiple records. Within each record, create one item per distinct approved job or service group. Preserve useful parts, labor, quantities, and technician notes in item details. Use YYYY-MM-DD dates. Do not invent missing values. Confidence is 0 to 1. Add record-specific warnings to each record and document-wide warnings at the top level. Return totals exactly as printed.` },
        fileContent,
      ] }],
      text: { format: { type: "json_schema", name: "service_record_import", strict: true, schema } }
    })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(friendlyExtractionError(response.status, body?.error?.message));
  const outputText = body.output?.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content || []).find((item: { type: string }) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("The document could not be read.");
  return JSON.parse(outputText) as ExtractedServiceDocument;
}
