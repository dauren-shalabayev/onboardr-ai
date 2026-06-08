import { z } from "zod";

function getKbConfig() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const kbId = import.meta.env.VITE_KB_ID ?? "default";

  if (!baseUrl) {
    throw new Error(
      "VITE_API_URL не задан. Добавьте URL API в .env (локально) или в переменные окружения Vercel.",
    );
  }

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

export async function listDocuments() {
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
}

export async function addDocument(file: File) {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
    throw new Error("Поддерживаются только .pdf и .docx");
  }

  const formData = new FormData();
  formData.append("file", file);

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
}

const kbChatResponseSchema = z.object({
  answer: z.string(),
  sources: z
    .array(
      z.object({
        document_id: z.string(),
        score: z.number(),
        excerpt: z.string(),
      }),
    )
    .optional(),
});

export async function chatWithAi(message: string) {
  const { baseUrl, kbId } = getKbConfig();
  const response = await fetch(`${baseUrl}/v1/kb/${kbId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
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
}
