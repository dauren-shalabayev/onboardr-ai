import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listDocuments = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("id, name, size, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const addDocument = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(500),
      content: z.string().min(1).max(500_000),
    })
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("documents").insert({
      name: data.name,
      content: data.content,
      size: data.content.length,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
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
    const baseUrl = process.env.KB_API_BASE_URL ?? "http://127.0.0.1:8083";
    const kbId = process.env.KB_ID ?? "default";
    const url = `${baseUrl.replace(/\/$/, "")}/v1/kb/${kbId}/chat`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: data.message }),
    });

    if (!response.ok) {
      const t = await response.text();
      throw new Error(
        response.status === 503 || response.status === 502
          ? "Сервис базы знаний недоступен. Проверьте, что API запущен."
          : `Ошибка KB API: ${response.status} ${t}`
      );
    }

    const json = kbChatResponseSchema.parse(await response.json());
    return {
      reply: json.answer,
      sources: json.sources ?? [],
    };
  });