export default function SettingPage() {
  return (
    <section className="space-y-6 rounded-3xl border border-border/80 bg-card/80 p-8 shadow-sm">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Setting</h1>
        <p className="text-sm text-muted-foreground">
          現在は、認証やバックエンド接続を使わずに画面を確認できるデモモードです。
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-background px-6 py-5">
        <h2 className="text-sm font-semibold">バックエンド連携</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Supabase認証、サインアウト、Goalリセットは一時的に無効化しています。
          データ設計を確定してから、この画面に設定機能を戻します。
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Plan画面の編集内容は現在ブラウザ内だけで保持され、再読み込みすると初期状態に戻ります。
      </p>
    </section>
  );
}
