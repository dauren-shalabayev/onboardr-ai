import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Вход — Boostra" },
      { name: "description", content: "Вход в систему Boostra AI Онбординг" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      router.navigate({ to: "/" });
    } else {
      toast.error("Неверный логин или пароль");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--gradient-subtle)" }}
    >
      <Card className="w-full max-w-md p-8" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <div className="flex flex-col items-center mb-8">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center text-primary-foreground mb-4"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Boostra</h1>
          <p className="text-sm text-muted-foreground mt-1">AI Онбординг</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="u">Логин</Label>
            <Input
              id="u"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p">Пароль</Label>
            <Input
              id="p"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin"
            />
          </div>
          <Button type="submit" className="w-full">
            Войти
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Тестовый доступ: admin / admin
          </p>
        </form>
      </Card>
    </div>
  );
}