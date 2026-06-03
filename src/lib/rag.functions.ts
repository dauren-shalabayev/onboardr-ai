import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listDocuments = createServerFn({ method: "GET" }).handler(async () => {
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
    const { error } = await supabaseAdmin.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const chatWithAi = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      messages: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1).max(10_000),
          })
        )
        .min(1)
        .max(50),
    })
  )
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY не настроен");

    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select("name, content")
      .order("created_at", { ascending: false })
      .limit(20);

    const knowledge =
      docs && docs.length > 0
        ? docs
            .map((d) => `### ${d.name}\n${d.content.slice(0, 8000)}`)
            .join("\n\n---\n\n")
        : "(база знаний пуста)";

    const systemPrompt = `Ты — Boostra, AI-ассистент для онбординга сотрудников. Отвечай дружелюбно, кратко и по делу на русском языке. Используй базу знаний ниже как основной источник информации. Если ответа в базе нет — честно скажи об этом.\n\n# База знаний\n${knowledge}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...data.messages],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("Слишком много запросов, попробуйте позже");
      if (response.status === 402) throw new Error("Закончились кредиты Lovable AI");
      const t = await response.text();
      throw new Error(`AI error: ${response.status} ${t}`);
    }

    const json = await response.json();
    const reply = json.choices?.[0]?.message?.content ?? "Не удалось получить ответ.";
    return { reply };
  });