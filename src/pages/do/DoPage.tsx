// src/pages/do/DoPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useDoPageData } from "../../features/do/hooks/useDoPageData";
import { doRepository } from "../../repositories/doRepository";
import type { NextTask, TodayStats } from "../../types/domain";

/* =========================================================
 * メインコンポーネント
 * =======================================================*/

export const DoPage: React.FC = () => {
  const navigate = useNavigate();

  const { state, reload } = useDoPageData(doRepository);

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

  // status === "ready"
  const task = state.task; // NextTask | null
  const stats = state.stats; // TodayStats | null

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
 * 「今やるタスク」カード（NextTask前提）
 * =======================================================*/

interface NowCardProps {
  task: NextTask;
  onStart: () => void;
}

const NowCard: React.FC<NowCardProps> = ({ task, onStart }) => {
  const progress = Math.max(0, Math.min(100, task.subgoalProgress ?? 0));

  return (
    <section className="rounded-3xl border border-border/80 bg-card/70 p-8 shadow-sm">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Now
        </p>
        <h2 className="text-2xl font-semibold text-card-foreground">
          今やるタスク
        </h2>
        <p className="text-sm text-muted-foreground">
          いま集中するタスクはこれだけです。
        </p>
      </header>

      <div className="mt-6 space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Subgoal
          </p>
          <p className="text-xl font-semibold text-card-foreground">
            {task.subgoalTitle}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Task
          </p>
          <p className="text-xl font-semibold text-card-foreground">
            {task.title}
          </p>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Subgoal Progress
            </p>
            <span className="text-xs font-mono text-muted-foreground">
              {progress}%
            </span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onStart}
            className="
              inline-flex w-full items-center justify-center
              rounded-full bg-primary px-6 py-2.5
              text-sm font-medium text-primary-foreground
              shadow-sm hover:bg-primary/90
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring/70 focus-visible:ring-offset-2
              disabled:pointer-events-none disabled:opacity-60
              sm:w-auto
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
 * 今日の記録カード（TodayStats前提）
 * =======================================================*/
interface TodayCardProps {
  stats: TodayStats;
}

const TodayCard: React.FC<TodayCardProps> = ({ stats }) => {
  const { totalTasks, completedTasks } = stats;
  const rate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <section className="rounded-3xl border border-border/80 bg-card/70 p-8 shadow-sm">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Today
        </p>
        <h2 className="text-2xl font-semibold text-card-foreground">
          今日の記録
        </h2>
        <p className="text-sm text-muted-foreground">
          今日の進捗サマリーです。数値だけを見て次の意思決定を軽くします。
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Total Tasks
          </p>
          <p className="mt-1 text-2xl font-semibold text-card-foreground">
            {totalTasks} <span className="text-base font-medium">個</span>
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Completed
          </p>
          <p className="mt-1 text-2xl font-semibold text-card-foreground">
            {completedTasks} <span className="text-base font-medium">個</span>
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Completion Rate
          </p>
          <p className="mt-1 text-2xl font-semibold text-card-foreground">
            {rate} <span className="text-base font-medium">%</span>
          </p>
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
        <div key={i} className="space-y-2 rounded-md bg-muted px-3 py-2.5">
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
