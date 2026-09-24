import { Outlet } from "react-router-dom";

// Focus 中はナビゲーションを表示しない。Do ページからのみ遷移し、完了/中断で戻る。
export default function FocusLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <main className="w-full max-w-3xl">
        <Outlet />
      </main>
    </div>
  );
}
