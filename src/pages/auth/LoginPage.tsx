import { supabase } from "@/lib/supabaseClient";
import { FormEvent, useEffect, useState } from "react";
import {
  Link,
  type Location,
  useLocation,
  useNavigate,
} from "react-router-dom";

interface LoginLocationState {
  from?: Location;
}

const defaultMessage =
  "入力したメールアドレス宛にサインイン用のマジックリンクを送信します。";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const redirectPath = locationState?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState(defaultMessage);
  const [error, setError] = useState<string | null>(null);

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

    const { error } = await supabase.auth.signInWithOtp({
      email: emailValue,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }

    setStatus("done");
    setMessage(
      "メールを確認してください。届いたリンクからMonoToDoに戻ると自動でログインできます。"
    );
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
            {status === "done"
              ? "メール送信が完了しました。受信トレイからリンクをご確認ください。"
              : "Supabase 認証でマジックリンクを送信します。"}
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
              disabled={status === "loading" || status === "done"}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base shadow-inner focus:border-primary focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={!email || status === "loading" || status === "done"}
            className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {status === "loading" ? "送信中..." : "マジックリンクを送信"}
          </button>
        </form>

        {error && (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            エラー: {error}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{message}</p>

        <footer className="space-y-2 text-sm text-muted-foreground">
          <p>同じメールでリンクを受け取るとアカウントが自動作成されます。</p>
          <Link
            to="/"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Do ページへ戻る
          </Link>
        </footer>
      </div>
    </div>
  );
}
