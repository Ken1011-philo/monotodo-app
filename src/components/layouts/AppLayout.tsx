import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Do" },
  { to: "/plan", label: "Plan" },
  { to: "/setting", label: "Setting" },
];

export default function AppLayout() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            MonoToDo
          </p>
          <h1 className="text-xl font-semibold">
            “次の一つ”に集中するプランナー
          </h1>
        </div>
        <nav className="flex gap-3 text-sm font-medium text-muted-foreground">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-full border border-transparent px-4 py-2 transition-colors",
                  isActive
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "hover:text-primary"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          {isSigningOut ? "サインアウト中…" : "サインアウト"}
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
