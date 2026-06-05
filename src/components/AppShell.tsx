import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { MessageSquare, Database, LogOut, Sparkles, Phone } from "lucide-react";
import { logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { contacts } from "@/lib/onboarding-data";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/", label: "Спросить AI", icon: MessageSquare },
    { to: "/admin", label: "База знаний", icon: Database },
  ];

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-lg leading-none">Boostra</div>
              <div className="text-xs text-muted-foreground mt-1">AI Онбординг</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Phone className="h-3.5 w-3.5" />
            Контакты
          </div>
          <div className="space-y-2">
            {contacts.map((c) => (
              <div key={c.role} className="text-xs">
                <div className="font-medium">{c.role}</div>
                <div className="text-muted-foreground">{c.name}</div>
                <div className="text-muted-foreground/80">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
