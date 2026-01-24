import { supabase } from "@/lib/supabaseClient";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { type Location, Link, useLocation, useNavigate } from "react-router-dom";

interface LoginLocationState {
  from?: Location;
}

const defaultMessage = "メールアドレスとパスワードでログインします。";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const authLinkState = useMemo(
    () => (locationState?.from ? { from: locationState.from } : undefined),
    [locationState?.from]
  );
  const redirectPath = locationState?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState(defaultMessage);
  const [error, setError] = useState<string | null>(null);

  const disabled = status === "loading";

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        navigate(redirectPath, { replace: true });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) {
        navigate(redirectPath, { replace: true });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate, redirectPath]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus("loading");
    setMessage("ログイン処理を実行しています...");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setMessage(defaultMessage);
      setStatus("idle");
      return;
    }

    navigate(redirectPath, { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-xl items-center justify-center px-4 py-10">
      <div className="w-full space-y-6 rounded-3xl border border-border bg-card/70 px-6 py-8 shadow-sm backdrop-blur">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">ログイン</h1>
          <p className="text-sm text-muted-foreground">{defaultMessage}</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">
            <span className="text-muted-foreground">メールアドレス</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              required
              disabled={disabled}
              autoComplete="email"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base shadow-inner focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block space-y-2 text-sm font-medium">
            <span className="text-muted-foreground">パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              disabled={disabled}
              autoComplete="current-password"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base shadow-inner focus:border-primary focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={!email || !password || disabled}
            className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {status === "loading" ? "ログイン中..." : "ログイン"}
          </button>

          {/* 新規登録導線（from を維持） */}
          <div className="pt-1">
            <Link
              to="/signup"
              state={authLinkState}
              className="block w-full rounded-2xl border border-border bg-background px-4 py-3 text-center text-sm font-semibold transition hover:bg-secondary/40"
            >
              新規登録
            </Link>
          </div>
        </form>

        {error && (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            エラー: {error}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{message}</p>

        <footer className="space-y-2 text-sm text-muted-foreground"></footer>
      </div>
    </div>
  );
}
