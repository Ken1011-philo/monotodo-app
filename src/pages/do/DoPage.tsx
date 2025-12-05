// src/pages/do/DoPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useDoPageData } from "../../features/do/hooks/useDoPageData";
import type { DoRepo, Task, TodayStats } from "../../types/domain";

/* =========================================================
 * 開発用 in-memory リポジトリ
 * =======================================================*/
const inMemoryRepo: DoRepo = (() => {
  let tasks: Task[] = [];

  const getNextTask = async () => {
    const pending = tasks.filter((t) => t.status === "pending");
    pending.sort((a, b) => a.order - b.order);
    return pending[0] ?? null;
  };

  const getTodayStats = async (): Promise<TodayStats> => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    return { totalTasks, completedTasks };
  };

  if (typeof window !== "undefined") {
    // @ts-expect-error dev helper
    window.__seedDoTasks = (seed: Task[]) => {
      tasks = [...seed];
      console.log("[Do/dev] seeded tasks:", tasks);
    };
  }

  return {
    getNextTask,
    getTodayStats,
  };
})();

/* =========================================================
 * メインコンポーネント
 * =======================================================*/

export const DoPage: React.FC = () => {
  const navigate = useNavigate();

  // ★ 型は useDoPageData 側に任せる（キャストしない）
  const { state, reload } = useDoPageData(inMemoryRepo);

  if (state.status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <NowCardSkeleton />
          <TodayCardSkeleton />
        </main>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <ErrorCard
            message={state.error ?? "タスク情報の取得に失敗しました。"}
            onRetry={reload}
          />
        </main>
      </div>
    );
  }

  // ここに来る時点で status === "ready" 想定
  const task = state.task;
  const stats = state.stats; // ★ todayStats ではなく stats

  const handleStart = () => {
    if (!task) return;
    navigate(`/focus?taskId=${encodeURIComponent(task.id)}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {task ? <NowCard task={task} onStart={handleStart} /> : <EmptyNowCard />}
        {stats && <TodayCard stats={stats} />}
      </main>
    </div>
  );
};


/* =========================================================
 * 「今やるタスク」カード
 * =======================================================*/

interface NowCardProps {
  task: Task;
  onStart: () => void;
}

const NowCard: React.FC<NowCardProps> = ({ task, onStart }) => {
  const isCompleted = task.status === "completed";
  const progress = isCompleted ? 100 : 0;

  return (
    <section
      className="
        rounded-2xl border border-border
        bg-card/90
        shadow-[0_18px_45px_rgba(0,0,0,0.18)]
      "
    >
      <div className="px-6 pb-5 pt-6 sm:px-6 sm:pb-5 sm:pt-6">
        <h2 className="mb-2 text-[1.35rem] font-semibold text-card-foreground">
          今やるタスク
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          いま集中するタスクはこれだけです。
        </p>

        <div className="mb-3">
          <p className="mb-1 text-sm font-medium text-card-foreground">
            タスク名
          </p>
          <p className="text-base text-card-foreground">{task.title}</p>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
            <div
              className="
                h-full rounded-full bg-primary
                transition-[width] duration-150 ease-out
              "
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {isCompleted ? "完了" : "未完了"}
          </span>
        </div>

        {/* 仕様上必要なのは「開始」だけなので、このボタンだけ残す */}
        <div className="mt-1 flex flex-wrap gap-2.5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onStart}
            className="
              inline-flex items-center justify-center
              rounded-full
              bg-primary px-4 py-2
              text-sm font-medium text-primary-foreground
              shadow-sm
              hover:bg-primary/90
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-primary focus-visible:ring-offset-2
              disabled:pointer-events-none disabled:opacity-60
              w-full sm:w-auto
            "
          >
            タスク開始
          </button>
        </div>
      </div>
    </section>
  );
};


/* =========================================================
 * タスクが無いときのカード
 * =======================================================*/

const EmptyNowCard: React.FC = () => (
  <section
    className="
      rounded-2xl border border-border
      bg-card/90
      shadow-[0_18px_45px_rgba(0,0,0,0.18)]
    "
  >
    <div className="px-6 pb-5 pt-6 sm:px-6 sm:pb-5 sm:pt-6">
      <h2 className="mb-2 text-[1.35rem] font-semibold text-card-foreground">
        今やるタスクはありません
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        今日やるタスクは Plan ページで決めてください。
      </p>
      <p className="text-xs text-muted-foreground">
        Plan で「今日やる」を設定すると、ここに 1 件だけ表示されます。
      </p>
    </div>
  </section>
);

/* =========================================================
 * 今日の記録カード
 * =======================================================*/
interface TodayCardProps {
  stats: TodayStats;
}

const TodayCard: React.FC<TodayCardProps> = ({ stats }) => {
  const { totalTasks, completedTasks } = stats;
  const rate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <section
      className="
        rounded-2xl border border-border
        bg-card/95
        px-6 py-5
      "
    >
      <h2 className="mb-3 text-[1.05rem] font-semibold text-card-foreground">
        今日の記録
      </h2>

      <div
        className="
          grid grid-cols-1 gap-2.5
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        <div className="rounded-md bg-muted px-3 py-2.5">
          <p className="text-xs text-muted-foreground">今日のタクス</p>
          <p className="text-sm font-medium text-card-foreground">
            {totalTasks} 個
          </p>
        </div>

        <div className="rounded-md bg-muted px-3 py-2.5">
          <p className="text-xs text-muted-foreground">完了したサブゴール</p>
          <p className="text-sm font-medium text-card-foreground">
            {completedTasks} 個
          </p>
        </div>

        <div className="rounded-md bg-muted px-3 py-2.5">
          <p className="text-xs text-muted-foreground">サブゴール完了率</p>
          <p className="text-sm font-medium text-card-foreground">{rate} %</p>
        </div>
      </div>
    </section>
  );
};


/* =========================================================
 * ローディング用スケルトン
 * =======================================================*/

const NowCardSkeleton: React.FC = () => (
  <section
    className="
      rounded-2xl border border-border
      bg-card/90
      shadow-[0_18px_45px_rgba(0,0,0,0.18)]
      animate-pulse
    "
  >
    <div className="space-y-3 px-6 pb-5 pt-6 sm:px-6 sm:pb-5 sm:pt-6">
      <div className="h-4 w-1/3 rounded-full bg-muted" />
      <div className="h-3 w-1/2 rounded-full bg-muted" />
      <div className="mt-3 h-2 w-full rounded-full bg-muted" />
      <div className="flex flex-wrap gap-2.5 pt-2">
        <div className="h-9 w-28 rounded-full bg-muted" />
        <div className="h-9 w-28 rounded-full bg-muted" />
        <div className="h-9 w-28 rounded-full bg-muted" />
      </div>
    </div>
  </section>
);

const TodayCardSkeleton: React.FC = () => (
  <section
    className="
      rounded-2xl border border-border
      bg-card/95
      px-6 py-5
      animate-pulse
    "
  >
    <div className="mb-3 h-4 w-32 rounded-full bg-muted" />
    <div
      className="
        grid grid-cols-1 gap-2.5
        sm:grid-cols-2
        lg:grid-cols-3
      "
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="space-y-2 rounded-md bg-muted px-3 py-2.5"
        >
          <div className="h-3 w-1/2 rounded-full bg-background/60" />
          <div className="h-4 w-1/3 rounded-full bg-background/60" />
        </div>
      ))}
    </div>
  </section>
);

/* =========================================================
 * エラー表示カード
 * =======================================================*/

interface ErrorCardProps {
  message: string;
  onRetry: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ message, onRetry }) => (
  <section
    className="
      rounded-2xl border border-destructive/40
      bg-destructive/10
      px-6 py-5
    "
  >
    <h2 className="mb-2 text-[1.05rem] font-semibold text-destructive">
      読み込みエラー
    </h2>
    <p className="mb-4 text-sm text-destructive">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="
        inline-flex items-center justify-center
        rounded-full
        bg-destructive px-4 py-2
        text-sm font-medium text-destructive-foreground
        shadow-sm
        hover:bg-destructive/90
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-destructive focus-visible:ring-offset-2
      "
    >
      もう一度読み込む
    </button>
  </section>
);

export default DoPage;
