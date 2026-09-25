import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavLink, Outlet } from "react-router-dom";

import { PageContainer } from "./PageContainer";

const navItems = [
  { to: "/", label: "Do" },
  { to: "/plan", label: "Plan" },
  { to: "/setting", label: "Setting" },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-nav-divider bg-nav-background">
        <PageContainer className="flex items-center justify-between gap-4 py-3">
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
                      "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </PageContainer>
      </header>

      <main>
        <PageContainer className="flex flex-col gap-8 py-8 sm:py-10">
          <Outlet />
        </PageContainer>
      </main>
    </div>
  );
}
