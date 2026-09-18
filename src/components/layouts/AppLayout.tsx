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
      <header className="border-b border-nav-divider bg-nav-background px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <img
          alt="MonoToDo"
          className="size-10 object-contain"
          height={40}
          src="/monotodo-icon.png"
          width={40}
        />
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

      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
