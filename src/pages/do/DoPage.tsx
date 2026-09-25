// src/pages/do/DoPage.tsx
import React from "react";
import { AlertCircle, CalendarPlus, Play } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Eyebrow, SectionHeader } from "@/components/common/SectionHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDoPageData } from "../../features/do/hooks/useDoPageData";
import { demoDoRepository } from "../../repositories/demoDoRepository";
import type { NextTask, TodayStats } from "../../types/domain";

/* =========================================================
 * メインコンポーネント
 * =======================================================*/

export const DoPage: React.FC = () => {
  const navigate = useNavigate();

  const { state, reload } = useDoPageData(demoDoRepository);

  if (state.status === "loading") {
    return (
      <DoPageLayout
        main={<NowCardSkeleton />}
        aside={<TodayCardSkeleton />}
      />
    );
  }

  if (state.status === "error") {
    return (
      <DoPageLayout
        main={
          <ErrorCard
            message={state.error ?? "タスク情報の取得に失敗しました。"}
            onRetry={reload}
          />
        }
      />
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
    <DoPageLayout
      main={
        task ? <NowCard task={task} onStart={handleStart} /> : <EmptyNowCard />
      }
      aside={stats ? <TodayCard stats={stats} /> : null}
    />
  );
};

/* =========================================================
 * ページの割り付け
 * 広い画面（lg 以上）では「今やるタスク」をメイン列、今日の記録を右列に置く
 * =======================================================*/

interface DoPageLayoutProps {
  main: React.ReactNode;
  aside?: React.ReactNode;
}

const DoPageLayout: React.FC<DoPageLayoutProps> = ({ main, aside }) => (
  <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div className="flex min-w-0 flex-col gap-6">{main}</div>
    {aside && (
      <aside aria-label="今日の記録" className="flex flex-col gap-6">
        {aside}
      </aside>
    )}
  </div>
);

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
    <Card>
      <CardHeader>
        <SectionHeader
          eyebrow="Now"
          title="今やるタスク"
          description="いま集中するタスクはこれだけです。"
        />
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-1">
          <Eyebrow>Subgoal</Eyebrow>
          <p className="text-xl font-semibold">{task.subgoalTitle}</p>
        </div>

        <div className="space-y-1">
          <Eyebrow>Task</Eyebrow>
          <p className="text-xl font-semibold">{task.title}</p>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <Eyebrow>Subgoal Progress</Eyebrow>
            <span className="font-mono text-xs text-muted-foreground">
              {progress}%
            </span>
          </div>
          <Progress value={progress} aria-label="サブゴールの進捗" />
        </div>
      </CardContent>

      <CardFooter>
        <Button size="lg" onClick={onStart} className="w-full sm:w-auto">
          <Play />
          タスク開始
        </Button>
      </CardFooter>
    </Card>
  );
};

/* =========================================================
 * タスクが無いときのカード
 * =======================================================*/

const EmptyNowCard: React.FC = () => (
  <Card>
    <CardHeader>
      <SectionHeader
        eyebrow="Now"
        title="今やるタスクはありません"
        description="今日やるタスクは Plan ページで決めてください。Plan の一番上のタスクが、ここに 1 件だけ表示されます。"
      />
    </CardHeader>
    <CardFooter>
      <Button asChild variant="outline">
        <Link to="/plan">
          <CalendarPlus />
          Plan を開く
        </Link>
      </Button>
    </CardFooter>
  </Card>
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
    <Card className="@container/today">
      <CardHeader>
        <SectionHeader
          eyebrow="Today"
          title="今日の記録"
          description="今日の進捗サマリーです。数値だけを見て次の意思決定を軽くします。"
        />
      </CardHeader>

      {/* カード自身の幅で並びを切り替える（右列では縦並び、全幅では横に 3 つ） */}
      <CardContent className="grid grid-cols-1 gap-4 @md/today:grid-cols-3">
        <StatTile label="Total Tasks" value={totalTasks} unit="個" />
        <StatTile label="Completed" value={completedTasks} unit="個" />
        <StatTile label="Completion Rate" value={rate} unit="%" />
      </CardContent>
    </Card>
  );
};

interface StatTileProps {
  label: string;
  value: number;
  unit: string;
}

const StatTile: React.FC<StatTileProps> = ({ label, value, unit }) => (
  <div className="rounded-lg border bg-background/60 p-4">
    <Eyebrow>{label}</Eyebrow>
    <p className="mt-1 text-2xl font-semibold">
      {value} <span className="text-base font-medium">{unit}</span>
    </p>
  </div>
);

/* =========================================================
 * ローディング用スケルトン
 * =======================================================*/

const NowCardSkeleton: React.FC = () => (
  <Card aria-busy="true" aria-label="読み込み中">
    <CardHeader className="space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-64" />
    </CardHeader>
    <CardContent className="space-y-5">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-2 w-full" />
    </CardContent>
    <CardFooter>
      <Skeleton className="h-10 w-32" />
    </CardFooter>
  </Card>
);

const TodayCardSkeleton: React.FC = () => (
  <Card aria-busy="true" aria-label="読み込み中" className="@container/today">
    <CardHeader className="space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-7 w-40" />
    </CardHeader>
    <CardContent className="grid grid-cols-1 gap-4 @md/today:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </CardContent>
  </Card>
);

/* =========================================================
 * エラー表示カード
 * =======================================================*/

interface ErrorCardProps {
  message: string;
  onRetry: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ message, onRetry }) => (
  <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
    <AlertCircle />
    <AlertTitle>読み込みエラー</AlertTitle>
    <AlertDescription className="gap-3">
      <p>{message}</p>
      <Button variant="destructive" size="sm" onClick={onRetry}>
        もう一度読み込む
      </Button>
    </AlertDescription>
  </Alert>
);

export default DoPage;
