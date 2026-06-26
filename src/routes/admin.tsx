import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { listDocuments, addDocument, ingestConfluence } from "@/lib/rag.api";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "База знаний — Boostra" },
      { name: "description", content: "Управление файлами для обучения AI" },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <AdminPage />
      </AppShell>
    </AuthGate>
  ),
});

function AdminPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [confluenceLoading, setConfluenceLoading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => listDocuments(),
  });

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const lower = file.name.toLowerCase();
        if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
          toast.error(`${file.name}: поддерживаются только .pdf и .docx`);
          continue;
        }
        if (file.size > 10_000_000) {
          toast.error(`${file.name}: слишком большой (макс 10 МБ)`);
          continue;
        }
        await addDocument(file);
        toast.success(`Загружен: ${file.name}`);
      }
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onConfluenceRefresh = async () => {
    setConfluenceLoading(true);
    try {
      const res = await ingestConfluence();
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConfluenceLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">База знаний</h1>
            <p className="text-muted-foreground mt-2">
              Загружайте документы (.pdf, .docx) или обновите базу из Confluence.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void onConfluenceRefresh()}
            disabled={confluenceLoading || uploading}
          >
            {confluenceLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Обновить с Confluence
          </Button>
        </div>

        <Card
          className="p-8 mb-6 border-dashed border-2 cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.docx"
            className="hidden"
            onChange={onUpload}
          />
          <div className="flex flex-col items-center text-center">
            {uploading ? (
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
            ) : (
              <Upload className="h-10 w-10 text-primary mb-3" />
            )}
            <div className="font-medium">
              {uploading ? "Загрузка..." : "Нажмите, чтобы выбрать файлы"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              .pdf, .docx до 10 МБ
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border font-semibold">
            Загруженные файлы ({docs.length})
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
          ) : docs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Файлов пока нет. Загрузите первый, чтобы начать обучение.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {docs.map((d) => (
                <li key={d.id} className="px-6 py-3 flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.chunk_count} фрагм. ·{" "}
                      {new Date(d.created_at).toLocaleString("ru-RU")}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
