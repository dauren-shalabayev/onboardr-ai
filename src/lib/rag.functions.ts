import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function getKbConfig() {
  const baseUrl = process.env.KB_API_BASE_URL ?? "http://127.0.0.1:8083";
  const kbId = process.env.KB_ID ?? "default";
  return { baseUrl: baseUrl.replace(/\/$/, ""), kbId };
}

function kbApiError(status: number, text: string) {
  if (status === 503 || status === 502) {
    return "Сервис базы знаний недоступен. Проверьте, что API запущен.";
  }
  try {
    const json = JSON.parse(text) as { detail?: string | unknown };
    if (typeof json.detail === "string") return json.detail;
  } catch {
    // ignore parse errors
  }
  return `Ошибка KB API: ${status} ${text}`;
}

const kbDocumentInfoSchema = z.object({
  document_id: z.string(),
  chunk_count: z.number(),
  updated_at: z.string().nullable().optional(),
});

export const listDocuments = createServerFn({ method: "GET" }).handler(async () => {
  const { baseUrl, kbId } = getKbConfig();
  const response = await fetch(`${baseUrl}/v1/kb/${kbId}/documents`);

  if (!response.ok) {
    const t = await response.text();
    throw new Error(kbApiError(response.status, t));
  }

  const docs = z.array(kbDocumentInfoSchema).parse(await response.json());
  return docs.map((d) => ({
    id: d.document_id,
    name: d.document_id,
    chunk_count: d.chunk_count,
    created_at: d.updated_at ?? new Date().toISOString(),
  }));
});

export const addDocument = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(500),
      contentBase64: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const lower = data.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      throw new Error("Поддерживаются только .pdf и .docx");
    }

    const bytes = Buffer.from(data.contentBase64, "base64");
    const formData = new FormData();
    formData.append("file", new Blob([bytes]), data.name);

    const { baseUrl, kbId } = getKbConfig();
    const response = await fetch(`${baseUrl}/v1/kb/${kbId}/documents`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const t = await response.text();
      throw new Error(kbApiError(response.status, t));
    }

    return { ok: true };
  });

const kbChatResponseSchema = z.object({
  answer: z.string(),
  sources: z
    .array(
      z.object({
        document_id: z.string(),
        score: z.number(),
        excerpt: z.string(),
      })
    )
    .optional(),
});

export const chatWithAi = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      message: z.string().min(1).max(10_000),
    })
  )
  .handler(async ({ data }) => {
    const { baseUrl, kbId } = getKbConfig();
    const response = await fetch(`${baseUrl}/v1/kb/${kbId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: data.message }),
    });

    if (!response.ok) {
      const t = await response.text();
      throw new Error(kbApiError(response.status, t));
    }

    const json = kbChatResponseSchema.parse(await response.json());
    return {
      reply: json.answer,
      sources: json.sources ?? [],
    };
  });
