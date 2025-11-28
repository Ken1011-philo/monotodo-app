export default function FocusPage() {
  return (
    <section className="space-y-8 rounded-3xl bg-background/10 p-10 text-background shadow-xl shadow-black/20">
      <header className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-background/60">
          Focus
        </p>
        <h1 className="text-4xl font-semibold">ポモドーロタイマー</h1>
        <p className="text-sm text-background/70">
          ナビゲーションを排除し、一つのタスクに集中します。タイマーやダイアログの挙動は{" "}
          <code>useFocusTimer</code> と Supabase RPC
          の実装に合わせて組み込みます。
        </p>
      </header>

      <div className="flex flex-col items-center gap-4">
        <div className="flex h-56 w-56 items-center justify-center rounded-full border-4 border-background/60 text-5xl font-bold">
          25:00
        </div>
        <p className="text-sm text-background/70">タイマー UI はこれから追加します。</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold">
        <button
          type="button"
          className="rounded-full bg-background px-6 py-2 text-foreground transition hover:bg-background/80"
        >
          一時停止 / 再開 (準備中)
        </button>
        <button
          type="button"
          className="rounded-full border border-background/60 px-6 py-2 text-background hover:bg-background/10"
        >
          中断 (準備中)
        </button>
        <button
          type="button"
          className="rounded-full border border-background/60 px-6 py-2 text-background hover:bg-background/10"
        >
          完了して Do へ戻る (準備中)
        </button>
      </div>
    </section>
  );
}
