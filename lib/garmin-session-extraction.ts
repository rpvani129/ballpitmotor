export type ExtractedGarminSession = {
  session_number: number | null;
  started_at: string | null;
  best_lap: string | null;
  source_file_name: string;
  notes: string | null;
  confidence: number;
  warnings: string[];
};

export type ExtractedGarminImport = { warnings: string[]; sessions: ExtractedGarminSession[] };

const nullable = (type: "string" | "number") => ({ anyOf: [{ type }, { type: "null" }] });
const schema = {
  type: "object", additionalProperties: false, required: ["warnings", "sessions"],
  properties: {
    warnings: { type: "array", items: { type: "string" } },
    sessions: { type: "array", minItems: 1, maxItems: 50, items: {
      type: "object", additionalProperties: false,
      required: ["session_number", "started_at", "best_lap", "source_file_name", "notes", "confidence", "warnings"],
      properties: {
        session_number: nullable("number"), started_at: nullable("string"), best_lap: nullable("string"),
        source_file_name: { type: "string" }, notes: nullable("string"), confidence: { type: "number" },
        warnings: { type: "array", items: { type: "string" } },
      },
    } },
  },
};

export function friendlyGarminError(status: number, message?: string) {
  if (status === 429 || /quota|billing|credit/i.test(message ?? "")) return "Screenshot reading credits are unavailable. Check the OpenAI API billing balance, then try again.";
  if (status === 413 || /too large|maximum context|token limit/i.test(message ?? "")) return "The screenshot set is too large. Upload fewer images at one time.";
  if (status === 400 || /invalid|unsupported|could not process/i.test(message ?? "")) return "One or more screenshots could not be read. Use clear JPG, PNG, or WebP images.";
  if (status >= 500) return "The screenshot reader is temporarily unavailable. Try again in a few minutes.";
  return "The Garmin screenshots could not be read. Try clearer images or enter the sessions manually.";
}

export async function extractGarminSessions(files: { bytes: ArrayBuffer; mimeType: string; fileName: string }[], eventLabel: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const images = files.flatMap((file) => [
    { type: "input_text", text: `Source filename: ${file.fileName}` },
    { type: "input_image", image_url: `data:${file.mimeType};base64,${Buffer.from(file.bytes).toString("base64")}`, detail: "high" },
  ]);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_GARMIN_IMPORT_MODEL || "gpt-5.4-mini",
      input: [{ role: "user", content: [
        { type: "input_text", text: `Read these Garmin Catalyst screenshots for ${eventLabel}. Extract every distinct track session shown across the complete image set. Garmin may show a session list, a session detail, or both; deduplicate the same session when it appears in multiple screenshots. Return the displayed session number when clear, start time in 24-hour HH:MM format, and best lap in M:SS.xx or M:SS.xxx format. Use the exact source filename supplied with each image when identifying the source. Do not invent missing data. Add warnings for ambiguity or likely duplicates.` },
        ...images,
      ] }],
      text: { format: { type: "json_schema", name: "garmin_session_import", strict: true, schema } },
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(friendlyGarminError(response.status, body?.error?.message));
  const outputText = body.output?.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content || []).find((item: { type: string }) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("The Garmin screenshots could not be read.");
  return JSON.parse(outputText) as ExtractedGarminImport;
}
