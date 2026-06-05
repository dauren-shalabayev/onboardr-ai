export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="px-6 py-5 border-b border-border bg-card">
      <h1 className="text-xl font-semibold">{title}</h1>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </header>
  );
}
