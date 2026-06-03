import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { isLoggedIn } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.navigate({ to: "/login" });
    } else {
      setOk(true);
    }
  }, [router]);

  if (!ok) return null;
  return <>{children}</>;
}