import { supabase } from "@/lib/supabaseClient";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { type Location, Link, useLocation, useNavigate } from "react-router-dom";

interface LoginLocationState {
  from?: Location;
}

const MAX_EMAIL_LEN = 254;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().slice(0, MAX_EMAIL_LEN);
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const redirectPath = locationState?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // form: 登録フォーム
  // verify: メール確認案内（再送・ログイン導線）
  const [view, setView] = useState<"form" | "verify">("form");

  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [resendStatus, setResendStatus] = useState<"idle" | "loading">("idle");

  const [message, setMessage] = useState(
    "メールアドレスとパスワードでアカウントを作成します。"
  );
  const [error, setError] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);

  const disabled = useMemo(() => {
    // verify中はフォームを使わせない（＝二重送信防止）
    if (view === "verify") return true;
    return status === "loading";
  }, [status, view]);

  const confirmError = useMemo(() => {
    if (!passwordConfirm) return null;
    return passwordConfirm !== password ? "パスワードが一致しません。" : null;
  }, [passwordConfirm, password]);

  const canSubmit = useMemo(() => {
    if (disabled) return false;
    if (!normalizedEmail) return false;
    if (!password) return false;
    if (!passwordConfirm || confirmError) return false;
    return true;
  }, [disabled, normalizedEmail, password, passwordConfirm, confirmError]);

  // 既ログインならリダイレクト（LoginPage と同等）
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
    setMessage("アカウントを作成しています...");

    const emailValue = normalizeEmail(email);

    if (!emailValue) {
      setStatus("idle");
      setError("メールアドレスを入力してください。");
      setMessage("メールアドレスとパスワードでアカウントを作成します。");
      return;
    }
    if (emailValue.length > MAX_EMAIL_LEN) {
      setStatus("idle");
      setError("メールアドレスが長すぎます。");
      setMessage("メールアドレスとパスワードでアカウントを作成します。");
      return;
    }
    if (!password) {
      setStatus("idle");
      setError("パスワードを入力してください。");
      setMessage("メールアドレスとパスワードでアカウントを作成します。");
      return;
    }
    if (passwordConfirm !== password) {
      setStatus("idle");
      setError("確認用パスワードが一致しません。");
      setMessage("メールアドレスとパスワードでアカウントを作成します。");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: emailValue,
      password,
      // メール確認ON運用なら、本番URLに合わせて emailRedirectTo を設定するのが基本
      // options: { emailRedirectTo: `${window.location.origin}/login` },
    });

    if (error) {
      setStatus("idle");
      setError(error.message);
      setMessage("メールアドレスとパスワードでアカウントを作成します。");
      return;
    }

    // メール確認OFFならここで session が返ることがある（＝即ログイン）
    if (data.session) {
      navigate(redirectPath, { replace: true });
      return;
    }

    // メール確認ONの典型：session が返らない → 確認案内へ
    setStatus("idle");
    setView("verify");
    setError(null);

    // 画面上にパスワードを残す意味がないのでクリア（安全側）
    setPassword("");
    setPasswordConfirm("");

    setMessage(
      "登録を受け付けました。入力したメールアドレス宛に確認メールを送信しているはずなので、受信箱（迷惑メール含む）を確認し、メール内リンクから認証を完了してください。"
    );
  };

  const handleResend = async () => {
    setResendStatus("loading");
    setError(null);

    const emailValue = normalizeEmail(email);
    if (!emailValue) {
      setResendStatus("idle");
      setError("メールアドレスが空です。フォームに戻って入力してください。");
      return;
    }

    // supabase-js v2: auth.resend({ type: "signup", email })
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: emailValue,
      // options: { emailRedirectTo: `${window.location.origin}/login` },
    });

    if (error) {
      setResendStatus("idle");
      setError(error.message);
      return;
    }

    setResendStatus("idle");
    setMessage(
      "確認メールを再送しました。受信箱（迷惑メール含む）をご確認ください。"
    );
  };

  const handleBackToForm = () => {
    setView("form");
    setError(null);
    setMessage("メールアドレスとパスワードでアカウントを作成します。");
    // email は残してもよいが、入力ミス修正のために残す設計にしている
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/40 px-4 py-12">
      <div className="w-full max-w-lg space-y-8 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-2xl backdrop-blur">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            MonoToDo
          </p>
          <h1 className="text-3xl font-semibold">新規登録</h1>
          <p className="text-sm text-muted-foreground">
            {status === "loading"
              ? "作成しています..."
              : view === "verify"
              ? "メール認証を完了してください。"
              : "Supabase 認証でアカウントを作成します（メール確認が必要です）。"}
          </p>
        </header>

        {/* 1) 登録フォーム */}
        {view === "form" && (
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
                inputMode="email"
                maxLength={MAX_EMAIL_LEN}
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
                autoComplete="new-password"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base shadow-inner focus:border-primary focus:outline-none"
              />
            </label>

            <label className="space-y-2 text-sm font-medium">
              パスワード（確認）
              <input
                type="password"
                name="passwordConfirm"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="••••••••"
                required
                disabled={disabled}
                autoComplete="new-password"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base shadow-inner focus:border-primary focus:outline-none"
              />
              {confirmError && (
                <p className="text-sm text-destructive">{confirmError}</p>
              )}
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {status === "loading" ? "作成中..." : "アカウント作成"}
            </button>

            <div className="pt-1">
              <Link
                to="/login"
                className="block w-full rounded-2xl border border-border bg-background px-4 py-3 text-center text-sm font-semibold transition hover:bg-secondary/40"
              >
                ログインへ戻る
              </Link>
            </div>
          </form>
        )}

        {/* 2) メール確認案内 */}
        {view === "verify" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm">
              <p className="font-semibold">メール認証が必要です</p>
              <p className="mt-2 text-muted-foreground">
                <span className="font-semibold text-foreground">送信先:</span>{" "}
                {normalizedEmail || "(未入力)"}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>受信箱と迷惑メールを確認してください。</li>
                <li>メール内リンクを開いて認証を完了してください。</li>
                <li>認証後、このアプリに戻ってログインしてください。</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendStatus === "loading"}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-secondary/40 disabled:opacity-60"
            >
              {resendStatus === "loading" ? "再送中..." : "確認メールを再送する"}
            </button>

            <Link
              to="/login"
              className="block w-full rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              ログインへ進む
            </Link>

            <button
              type="button"
              onClick={handleBackToForm}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-secondary/40"
            >
              メールアドレスを修正する
            </button>
          </div>
        )}

        {error && (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            エラー: {error}
          </p>
        )}

        <p className="text-sm text-muted-foreground">{message}</p>

        <footer className="space-y-2 text-sm text-muted-foreground">
          <p className="text-xs">
            注意: メール確認あり運用では、Supabase 側の Site URL / Redirect URLs が不整合だと
            認証リンクが機能しません。ダッシュボード設定も合わせて確認してください。
          </p>
        </footer>
      </div>
    </div>
  );
}
