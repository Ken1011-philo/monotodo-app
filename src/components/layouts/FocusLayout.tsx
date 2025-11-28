import { Outlet } from "react-router-dom";

export default function FocusLayout() {
  return (
    <div className="min-h-screen bg-foreground text-background">
      <header className="px-6 py-12 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-background/60">
          Focus Session
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          他の操作は隠し、タスクに没頭する時間
        </h1>
        <p className="mt-4 text-sm text-background/70">
          Spec に従い、このレイアウトではナビゲーションを表示しません。Do
          ページからのみ遷移し、完了時に戻ります。
        </p>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-12">
        <Outlet />
      </main>
    </div>
  );
}
