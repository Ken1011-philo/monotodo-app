// src/features/do/hooks/useDoPageData.ts
import { useCallback, useEffect, useState } from "react";
import type { DoRepo, Task, TodayStats } from "../../../types/domain";

type DoPageStatus = "loading" | "ready" | "error";

export interface DoPageState {
  status: DoPageStatus;
  task: Task | null;
  stats: TodayStats | null;
  error?: string | null;
}

/**
 * Doページ用データ取得フック
 *
 * - 初回マウント時に getNextTask / getTodayStats を両方呼ぶ
 * - 失敗時は status: "error" にする
 * - reload() で再取得
 */
export function useDoPageData(repo: DoRepo) {
  const [state, setState] = useState<DoPageState>({
    status: "loading",
    task: null,
    stats: null,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: "loading",
      error: null,
    }));

    try {
      const [task, stats] = await Promise.all([
        repo.getNextTask(),
        repo.getTodayStats(),
      ]);

      setState({
        status: "ready",
        task: task ?? null,
        stats: stats ?? null,
        error: null,
      });
    } catch (e) {
      console.error("useDoPageData fetchAll error:", e);
      setState((prev) => ({
        ...prev,
        status: "error",
        error:
          e instanceof Error ? e.message : "Doページのデータ取得に失敗しました。",
      }));
    }
  }, [repo]);

  // 初回マウント時に自動ロード
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const reload = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    state,
    reload,
  };
}
