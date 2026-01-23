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
  const redirectPath = locationState?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState(defaultMessage);
  const [error, setError] = useState<string | null>(null);

  const disabled = useMemo(() => status === "loading", [status]);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setStatus("loading");
    setError(null);
    setMessage(defaultMessage);

    const emailValue = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password,
    });

    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }

    if (data.session) {
      navigate(redirectPath, { replace: true });
      return;
    }

    setStatus("idle");
    setError("ログインに成功しましたが、セッションを取得できませんでした。");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/40 px-4 py-12">
      <div className="w-full max-w-lg space-y-8 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-2xl backdrop-blur">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            MonoToDo
          </p>
          <h1 className="text-3xl font-semibold">ログイン</h1>
          <p className="text-sm text-muted-foreground">
            {status === "loading"
              ? "ログインしています..."
              : "Supabase 認証でメールアドレスとパスワードを確認します。"}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="space-y-2 text-sm font-medium">
            メールアドレス
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={disabled}
              autoComplete="email"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base shadow-inner focus:border-primary focus:outline-none"
            />
          </label>

          <label className="space-y-2 text-sm font-medium">
            パスワード
            <input
              type="password"
              name="password"
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

          {/* 追加：新規登録導線 */}
          <div className="pt-1">
            <Link
              to="/signup"
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
