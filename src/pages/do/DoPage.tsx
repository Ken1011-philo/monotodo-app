import { Link } from "react-router-dom";

export default function DoPage() {
  return (
    <section className="space-y-8 rounded-3xl border border-border/80 bg-card/60 p-8 shadow-sm">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          今やる一つだけに集中
        </p>
        <h1 className="text-3xl font-semibold">Do</h1>
        <p className="text-sm text-muted-foreground">
          Supabase RPC から取得した「次のタスク」がここに表示される予定です。まだ
          repository / hooks が未実装なので、先にルーティングを整備しておきます。
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/focus"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Focus を開始する
        </Link>
        <Link
          to="/plan"
          className="inline-flex items-center justify-center rounded-full border border-border px-6 py-2 text-sm font-semibold text-primary transition hover:bg-muted"
        >
          Plan でブロックを編集
        </Link>
      </div>

      <section className="space-y-4 rounded-2xl border border-dashed border-border px-6 py-5">
        <h2 className="text-xl font-semibold">空状態ルール</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>E1: サブゴールが無い場合は Plan へ誘導</li>
          <li>E2: 通常タスク 0 件の時も Plan へ誘導</li>
          <li>E3: 未完了タスクがなければ完了メッセージを表示</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          上記ロジックは <code>useDoPageData</code> 実装時に Supabase RPC と整合するよう調整します。
        </p>
      </section>
    </section>
  );
}
