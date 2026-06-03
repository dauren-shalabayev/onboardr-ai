import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listDocuments, addDocument, deleteDocument } from "@/lib/rag.functions";

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
  const listFn = useServerFn(listDocuments);
  const addFn = useServerFn(addDocument);
  const delFn = useServerFn(deleteDocument);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => listFn(),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Файл удалён");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 500_000) {
          toast.error(`${file.name}: слишком большой (макс 500 КБ)`);
          continue;
        }
        const content = await file.text();
        await addFn({ data: { name: file.name, content } });
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

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">База знаний</h1>
          <p className="text-muted-foreground mt-2">
            Загружайте текстовые файлы (.txt, .md), чтобы обучить AI-ассистента отвечать на их основе.
          </p>
        </div>

        <Card
          className="p-8 mb-6 border-dashed border-2 cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".txt,.md,.json,.csv"
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
              .txt, .md, .json, .csv до 500 КБ
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
                      {(d.size / 1024).toFixed(1)} КБ ·{" "}
                      {new Date(d.created_at).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => delMut.mutate(d.id)}
                    disabled={delMut.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}