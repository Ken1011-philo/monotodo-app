import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

const loadingMessage = "セッションを確認しています…";

export default function RequireAuth() {
  const location = useLocation();
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let active = true;

    const syncSession = (session: Session | null) => {
      if (!active) return;
      setStatus(session ? "authenticated" : "unauthenticated");
    };

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return <p>{loadingMessage}</p>;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
