import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { chatWithAi } from "@/lib/rag.functions";
import { quickQuestions } from "@/lib/onboarding-data";
import { MessageContent } from "@/components/MessageContent";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Boostra — AI Онбординг" },
      { name: "description", content: "AI-ассистент по онбордингу" },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <ChatPage />
      </AppShell>
    </AuthGate>
  ),
});

type Msg = { role: "user" | "assistant"; content: string };

function ChatPage() {
  const chatFn = useServerFn(chatWithAi);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Привет! Я помогу разобраться с первым днём в компании: программы, доступы, заявки. Выберите вопрос ниже или напишите свой.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chatFn({ data: { message: trimmed } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (err) {
      toast.error((err as Error).message);
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <PageHeader
        title="Спросить AI"
        description="Ответы на основе базы знаний компании"
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {messages.length === 1 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">
                Популярные вопросы
              </div>
              <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  size="sm"
                  className="text-left h-auto py-2 px-3 whitespace-normal"
                  onClick={() => void sendMessage(q)}
                  disabled={loading}
                >
                  {q}
                </Button>
              ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === "user" ? "bg-secondary" : "text-primary-foreground"
                }`}
                style={
                  m.role === "assistant"
                    ? { background: "var(--gradient-primary)" }
                    : undefined
                }
              >
                {m.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] whitespace-pre-wrap text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}
              >
                <MessageContent text={m.content} variant={m.role} />
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-card border border-border">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form onSubmit={send} className="border-t border-border bg-card p-4">
        <div className="max-w-3xl mx-auto space-y-2">
          {messages.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q) => (
                <Button
                  key={q}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-muted-foreground"
                  onClick={() => setInput(q)}
                  disabled={loading}
                >
                  {q}
                </Button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Спросите про программы, доступы или заявки..."
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
