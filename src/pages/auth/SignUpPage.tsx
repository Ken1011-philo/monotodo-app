import { supabase } from "@/lib/supabaseClient";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { type Location, Link, useLocation, useNavigate } from "react-router-dom";

interface LoginLocationState {
  from?: Location;
}

const MAX_EMAIL_LEN = 254;

// Supabase の再送・サインアップ直後のクールダウン目安（実際は Supabase 側メッセージに従う）
const DEFAULT_COOLDOWN_SEC = 60;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().slice(0, MAX_EMAIL_LEN);
}

function extractCooldownSeconds(msg: string): number | null {
  // Supabase: "For security purposes, you can only request this after 57 seconds."
  const m = msg.match(/after\s+(\d+)\s+seconds?/i);
  if (!m) return null;
  const sec = Number(m[1]);
  return Number.isFinite(sec) ? sec : null;
}

/**
 * emailごとに「再送可能になる時刻」を保持する。
 * - 旧メールに送った直後 → 旧メールは当然クールダウン
 * - メール修正して再登録（新メールに送信）→ 新メールもクールダウン
 * UIは「現在表示中のメール」に紐づくクールダウンを表示する。
 */
type AvailableAtByEmail = Record<string, number>; // epoch ms

function calcRemainingSec(availableAtMs: number | undefined, nowMs: number): number {
  if (!availableAtMs) return 0;
  const diff = availableAtMs - nowMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 1000);
}

export default function SignUpPage() {
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
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // form: 登録フォーム
  // verify: メール確認案内（再送・ログイン導線）
  const [view, setView] = useState<"form" | "verify">("form");

  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [resendStatus, setResendStatus] = useState<"idle" | "loading">("idle");

  // emailごとの再送可能時刻（epoch ms）
  const [availableAtByEmail, setAvailableAtByEmail] = useState<AvailableAtByEmail>({});

  //  現在 verify 画面で扱うメール（※フォーム入力が変わっても verify 側はこれを基準にする）
  const [verifyEmail, setVerifyEmail] = useState<string>("");

  // カウントダウン用の現在時刻（1秒ごと更新）
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const [message, setMessage] = useState(
    "メールアドレスとパスワードでアカウントを作成します。"
  );
  const [error, setError] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);

  const disabled = useMemo(() => {
    // verify中はフォームを使わせない（＝二重送信防止）
    if (view === "verify") return true;
    return status === "loading";
  }, [view, status]);

  const confirmError = useMemo(() => {
    if (!passwordConfirm) return null;
    if (password !== passwordConfirm) return "パスワードが一致しません。";
    return null;
  }, [password, passwordConfirm]);

  const canSubmit = useMemo(() => {
    if (!normalizedEmail || !password || !passwordConfirm) return false;
    if (normalizedEmail.length > MAX_EMAIL_LEN) return false;
    if (confirmError) return false;
    if (disabled) return false;
    return true;
  }, [normalizedEmail, password, passwordConfirm, confirmError, disabled]);

  // verify 画面に出すクールダウン（verifyEmail に紐づく）
  const verifyCooldownSec = useMemo(() => {
    const key = verifyEmail;
    if (!key) return 0;
    return calcRemainingSec(availableAtByEmail[key], nowMs);
  }, [verifyEmail, availableAtByEmail, nowMs]);

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

  function setCooldownForEmail(emailKey: string, sec: number) {
    const clamped = Math.max(0, Math.floor(sec));
    if (!emailKey || clamped <= 0) return;

    const availableAt = Date.now() + clamped * 1000;
    setAvailableAtByEmail((prev) => ({
      ...prev,
      [emailKey]: Math.max(prev[emailKey] ?? 0, availableAt), // より遅い方を採用
    }));
  }

  function setDefaultCooldownForEmail(emailKey: string) {
    setCooldownForEmail(emailKey, DEFAULT_COOLDOWN_SEC);
  }

  function handleBackToForm() {
    setView("form");
    setError(null);
    setMessage("メールアドレスとパスワードでアカウントを作成します。");
    // verifyEmail は残しても良いが、UX的には「今の入力に合わせる」方が自然なのでクリア
    setVerifyEmail("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!canSubmit) return;

    // normalize は submit 時に固定（verify 画面では verifyEmail を基準にする）
    const submitEmail = normalizedEmail;

    setStatus("loading");
    setMessage("アカウント作成を実行しています...");

    const { error } = await supabase.auth.signUp({
      email: submitEmail,
      password,
    });

    if (error) {
      setError(error.message);

      // セキュリティ系のクールダウン文言がある場合に反映
      const cooldown = extractCooldownSeconds(error.message);
      if (cooldown) setCooldownForEmail(submitEmail, cooldown);

      setStatus("idle");
      setMessage("入力内容を確認してください。");
      return;
    }

    // 成功したら verify 画面へ
    setVerifyEmail(submitEmail);
    // 成功後も Supabase 側で一定時間再送できないことがあるので一旦デフォルトをセット
    setDefaultCooldownForEmail(submitEmail);

    setView("verify");
    setStatus("idle");
    setMessage("確認メールを送信しました。メール認証を完了してください。");
  }

  async function handleResend() {
    const targetEmail = verifyEmail;
    if (!targetEmail) return;

    setError(null);
    setResendStatus("loading");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
    });

    if (error) {
      setError(error.message);

      const cooldown = extractCooldownSeconds(error.message);
      if (cooldown) setCooldownForEmail(targetEmail, cooldown);

      setResendStatus("idle");
      return;
    }

    // 成功時も一定時間クールダウン扱いにする
    setDefaultCooldownForEmail(targetEmail);
    setResendStatus("idle");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-xl items-center justify-center px-4 py-10">
      <div className="w-full space-y-6 rounded-3xl border border-border bg-card/70 px-6 py-8 shadow-sm backdrop-blur">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">新規登録</h1>
          <p className="text-sm text-muted-foreground">
            メールアドレスとパスワードでアカウントを作成します。
          </p>
        </header>

        {/* 1) フォーム */}
        {view === "form" && (
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
                maxLength={MAX_EMAIL_LEN}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base shadow-inner focus:border-primary focus:outline-none"
              />
              {normalizedEmail && normalizedEmail.length > MAX_EMAIL_LEN && (
                <p className="text-sm text-destructive">
                  メールアドレスは {MAX_EMAIL_LEN} 文字以内にしてください。
                </p>
              )}
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
                autoComplete="new-password"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base shadow-inner focus:border-primary focus:outline-none"
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span className="text-muted-foreground">パスワード（確認）</span>
              <input
                type="password"
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
                state={authLinkState}
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
                {verifyEmail || "(未入力)"}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>受信箱と迷惑メールを確認してください。</li>
                <li>メール内リンクを開いて認証を完了してください。</li>
                <li>認証後、このアプリに戻ってログインしてください。</li>
              </ul>

              <p className="mt-3 text-xs text-muted-foreground">
                メールアドレスを修正した場合、修正前のアドレスにも確認メールが送信されています。
                修正後のアドレスで再登録すると、新しいアドレスにも送信されますが、いずれも一定時間は再送できません。
              </p>
            </div>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendStatus === "loading" || verifyCooldownSec > 0}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-secondary/40 disabled:opacity-60"
            >
              {resendStatus === "loading"
                ? "再送中..."
                : verifyCooldownSec > 0
                ? `再送まで ${verifyCooldownSec} 秒`
                : "確認メールを再送する"}
            </button>

            <Link
              to="/login"
              state={authLinkState}
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
      </div>
    </div>
  );
}
