import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Do" },
  { to: "/plan", label: "Plan" },
  { to: "/setting", label: "Setting" },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b border-nav-divider bg-nav-background px-4 py-3 sm:px-6">
        <NavLink to="/" aria-label="MonoToDo ホーム" className="shrink-0">
          <img
            alt="MonoToDo"
            className="size-10 object-contain"
            height={40}
            src="/monotodo-icon.png"
            width={40}
          />
        </NavLink>
        <nav className="flex gap-1 sm:gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "rounded-full border border-transparent px-4 text-muted-foreground",
                  isActive &&
                    "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
