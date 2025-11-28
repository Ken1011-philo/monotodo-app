// src/pages/do/DoPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

import { useDoPageData } from "../../features/do/hooks/useDoPageData";
import type { DoRepo, Task, TodayStats } from "../../types/domain";

/* =========================================================
 * 開発用 in-memory リポジトリ
 * - Task/TodayStats の形は domain.ts に合わせる
 * - 初期状態ではタスク 0 件
 * - window.__seedDoTasks([...]) でテストデータを投入
 * =======================================================*/
const inMemoryRepo: DoRepo = (() => {
  let tasks: Task[] = []; // 初期は空

  const getNextTask = async () => {
    // まだ完了していないタスク（status: "pending"）だけを対象にする
    const pending = tasks.filter((t) => t.status === "pending");

    // 並び順は order の小さいものを優先（仕様に合わせてここは調整してOK）
    pending.sort((a, b) => a.order - b.order);

    return pending[0] ?? null;
  };

  const getTodayStats = async () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status === "completed"
    ).length;

    const stats: TodayStats = {
      totalTasks,
      completedTasks,
    };

    return stats;
  };

  // --- 開発用ヘルパ ---
  // ブラウザコンソールからタスクを差し込めるようにする
  // 例:
  // window.__seedDoTasks([
  //   {
  //     id: "1",
  //     goalId: "g1",
  //     subgoalId: "s1",
  //     title: "テストタスク",
  //     order: 1,
  //     status: "pending",
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //   },
  // ])
  // @ts-expect-error dev helper
  window.__seedDoTasks = (seed: Task[]) => {
    tasks = [...seed];
  };

  return { getNextTask, getTodayStats };
})();

/* =========================
 *  共通 UI コンポーネント
 * =======================*/

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={["skel", className].filter(Boolean).join(" ")} />
);

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="progress__track">
    <div
      className="progress__fill"
      style={{ width: `${Math.round(value * 100)}%` }}
    />
  </div>
);

const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="page">
    <main className="main">{children}</main>
  </div>
);

/* =========================
 *  Now Task カード
 * =======================*/

type NowTaskCardProps = {
  task: Task;
  onStart: () => void;
};

const NowTaskCard: React.FC<NowTaskCardProps> = ({ task, onStart }) => {
  // domain.ts に合わせて、進捗は status から計算するだけにする
  const isCompleted = task.status === "completed";
  const progress = isCompleted ? 1 : 0;
  const valueText = isCompleted ? "完了" : "未完了";

  return (
    <section className="nowcard container">
      <div className="nowcard__inner">
        <h2 className="nowcard__title">{task.title}</h2>

        <p className="nowcard__subtitle">今日の進捗</p>
        <div className="nowcard__progress">
          <ProgressBar value={progress} />
          <span className="progress__value">{valueText}</span>
        </div>

        <div className="nowcard__buttons">
          <button className="btn btn--lg" onClick={onStart}>
            タスク開始
          </button>
          {/* バックエンド未実装なので一旦 disabled。将来 DoRepo にメソッド追加 */}
          <button className="btn btn--md" disabled>
            タスク終了
          </button>
          <button className="btn btn--md" disabled>
            気が散った
          </button>
        </div>
      </div>
    </section>
  );
};

const NowTaskCardSkeleton: React.FC = () => (
  <section className="nowcard container">
    <div className="nowcard__inner">
      <Skeleton className="nowcard__title" />
      <Skeleton className="nowcard__subtitle" />
      <div className="nowcard__progress">
        <div className="progress__track">
          <div className="progress__fill" />
        </div>
        <Skeleton className="progress__value" />
      </div>
      <div className="nowcard__buttons">
        <Skeleton className="btn--lg" />
        <Skeleton className="btn--md" />
        <Skeleton className="btn--md" />
      </div>
    </div>
  </section>
);

/* =========================
 *  今日の記録
 * =======================*/

const TodayStatsView: React.FC<{ stats: TodayStats }> = ({ stats }) => {
  const { totalTasks, completedTasks } = stats;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <section className="today container">
      <h2 className="today__heading">今日の記録</h2>
      <div className="today__grid">
        <div className="today__item">
          <span className="today__value">
            完了 {completedTasks} / {totalTasks}
          </span>
        </div>
        <div className="today__item">
          <span className="today__value">完了率 {completionRate}%</span>
        </div>
      </div>
    </section>
  );
};

const TodayStatsSkeleton: React.FC = () => (
  <section className="today container">
    <h2 className="today__heading">今日の記録</h2>
    <div className="today__grid">
      <div className="today__item">
        <Skeleton className="today__value" />
      </div>
      <div className="today__item">
        <Skeleton className="today__value" />
      </div>
    </div>
  </section>
);

/* =========================
 *  空状態（タスクが無いとき）
 * =======================*/

const EmptyNowTaskCard: React.FC = () => (
  <section className="nowcard container">
    <div className="nowcard__inner">
      <h2 className="nowcard__title">今日は「今やる」タスクがありません</h2>
      <p className="nowcard__subtitle">
        Planページで今日やるタスクを決めてから、またここに戻ってきてください。
      </p>
    </div>
  </section>
);

/* =========================
 *  ページ本体
 * =======================*/

const DoPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, reload } = useDoPageData(inMemoryRepo);

  const isReady = state.status === "ready";
  const task = isReady ? state.task : null;
  const stats = isReady ? state.stats : null;

  return (
    <PageShell>
      {/* ローディング中 */}
      {state.status === "loading" && (
        <>
          <NowTaskCardSkeleton />
          <TodayStatsSkeleton />
        </>
      )}

      {/* エラー時 */}
      {state.status === "error" && (
        <>
          <section className="nowcard container">
            <div className="nowcard__inner">
              <h2 className="nowcard__title">
                データの読み込みに失敗しました
              </h2>
              <p className="nowcard__subtitle">
                ネットワーク状況を確認して、もう一度お試しください。
              </p>
              <div className="nowcard__buttons">
                <button className="btn btn--lg" onClick={reload}>
                  再試行
                </button>
              </div>
            </div>
          </section>
          <TodayStatsSkeleton />
        </>
      )}

      {/* 正常系 */}
      {isReady && (
        <>
          {task ? (
            <NowTaskCard
              task={task}
              onStart={() => navigate(`/focus?taskId=${task.id}`)}
            />
          ) : (
            <EmptyNowTaskCard />
          )}

          {stats ? <TodayStatsView stats={stats} /> : <TodayStatsSkeleton />}
        </>
      )}
    </PageShell>
  );
};

export default DoPage;
