import { Link } from "react-router-dom";

export default function PlanPage() {
  return (
    <section className="space-y-8 rounded-3xl border border-border/80 bg-card/70 p-8 shadow-sm">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Plan</h1>
        <p className="text-sm text-muted-foreground">
          Goal / Subgoal / Task をブロック単位で設計するエリアです。Drag &
          Drop や Supabase RPC 連携はこれから実装しますが、画面遷移は先に整えておきます。
        </p>
      </header>

      <ol className="space-y-4 rounded-2xl border border-dashed border-border px-6 py-5 text-sm">
        <li className="leading-relaxed">
          <span className="font-semibold text-primary">1.</span> Goal タイトルを 1
          つだけ設定（空でも可）
        </li>
        <li className="leading-relaxed">
          <span className="font-semibold text-primary">2.</span> Subgoal (Block)
          を最大 30 件まで作成
        </li>
        <li className="leading-relaxed">
          <span className="font-semibold text-primary">3.</span> 各 Subgoal に通常 /
          ループタスクを 30 件まで割り当て
        </li>
      </ol>

      <p className="text-sm text-muted-foreground">
        計画を保存したら{" "}
        <Link to="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          Do ページ
        </Link>
        に戻って「次の一つ」に集中しましょう。
      </p>
    </section>
  );
}
