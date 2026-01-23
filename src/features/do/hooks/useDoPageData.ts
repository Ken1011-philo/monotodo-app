import { useCallback, useEffect, useState } from "react";
import type { DoRepo, NextTask, TodayStats } from "../../../types/domain";


type DoPageStatus = "loading" | "ready" | "error";

export interface DoPageState {
  status: DoPageStatus;
  task: NextTask | null;
  stats: TodayStats | null;
  error?: string | null;
}

export function useDoPageData(repo: DoRepo) {
  const [state, setState] = useState<DoPageState>({
    status: "loading",
    task: null,
    stats: null,
    error: null,
  });

  // useDoPageData.ts
  const fetchAll = useCallback(async () => {
  setState((prev) => ({ ...prev, status: "loading", error: null }));

  try {
  // 先に nextTask（＝aggregate込み）を完了させる
  const task = await repo.getNextTask();
  const stats = await repo.getTodayStats();

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
    error: e instanceof Error ? e.message : "Do page data fetch failed.",
  }));
  }
  }, [repo]);


  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const reload = useCallback(() => fetchAll(), [fetchAll]);

  return { state, reload };
}


