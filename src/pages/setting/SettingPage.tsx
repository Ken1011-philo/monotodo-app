import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

export default function SettingPage() {
  const [isResetting, setIsResetting] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleResetGoal = async () => {
    setIsResetting(true);
    try {
      const { error } = await supabase.rpc("monotodo_reset_goal");
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Failed to reset goal", error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <section className="space-y-6 rounded-3xl border border-border/80 bg-card/80 p-8 shadow-sm">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Setting</h1>
        <p className="text-sm text-muted-foreground">
          Supabase 認証状態や Goal リセット操作を管理します。実際の RPC 実装が揃い次第、この画面から設定を行えるようにします。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-2xl border border-border bg-background px-6 py-4 text-left text-sm font-semibold transition hover:bg-muted"
        >
          サインアウト
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Supabase のセッションをクリアしてログインページへ戻ります。
          </span>
        </button>

        <button
          type="button"
          onClick={handleResetGoal}
          disabled={isResetting}
          className="rounded-2xl border border-destructive/60 bg-destructive/10 px-6 py-4 text-left text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-60"
        >
          {isResetting ? "リセット中..." : "Goal をリセット (仮)"}
          <span className="mt-1 block text-xs font-normal text-destructive/80">
            RPC <code>monotodo_reset_goal</code> を通じて Goal 配下を削除します。
          </span>
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        リセット処理は PostgREST RPC を repository 層から呼ぶ構成にする予定です。UI
        では最終確認ダイアログや undo 提案も検討します。
      </p>
    </section>
  );
}
