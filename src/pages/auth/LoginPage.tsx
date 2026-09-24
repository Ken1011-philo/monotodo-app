import { AlertCircle, LogIn } from "lucide-react";

import { SectionHeader } from "@/components/common/SectionHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { type Location, useLocation, useNavigate } from "react-router-dom";

interface LoginLocationState {
  from?: Location;
}

const defaultMessage =
  "メールアドレスとパスワードでログインします。";

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

  const disabled = useMemo(
    () => status === "loading",
    [status],
  );

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

    // セッションが取れていれば onAuthStateChange でも遷移するが、明示的に遷移しておく
    if (data.session) {
      navigate(redirectPath, { replace: true });
      return;
    }

    // ここに来るのは稀だが、念のため
    setStatus("idle");
    setError("ログインに成功しましたが、セッションを取得できませんでした。");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/40 px-4 py-12">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader>
          <SectionHeader
            as="h1"
            eyebrow="MonoToDo"
            title="ログイン"
            description={
              status === "loading"
                ? "ログインしています..."
                : "Supabase 認証でメールアドレスとパスワードを確認します。"
            }
          />
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">メールアドレス</Label>
              <Input
                id="login-email"
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                disabled={disabled}
                autoComplete="email"
                aria-invalid={error ? "true" : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">パスワード</Label>
              <Input
                id="login-password"
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                disabled={disabled}
                autoComplete="current-password"
                aria-invalid={error ? "true" : undefined}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={!email || !password || disabled}
              className="w-full"
            >
              <LogIn />
              {status === "loading" ? "ログイン中..." : "ログイン"}
            </Button>
          </form>

          {error && (
            <Alert
              variant="destructive"
              className="border-destructive/40 bg-destructive/10"
            >
              <AlertCircle />
              <AlertTitle>ログインできませんでした</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardFooter>
      </Card>
    </div>
  );
}
