import { useCallback, useMemo, useReducer } from "react";

import {
  MAX_SUBGOALS,
  MAX_TASKS_PER_SUBGOAL,
  createEmptyTask,
  createInitialPlanDraft,
  createSubgoal,
  planDraftReducer,
} from "../model/planDraft";

/**
 * Plan ページの編集状態をまとめて扱うフック（ブラウザ内のみ、リロードで初期化）。
 * UI はここが返す値と操作だけに依存する。
 */
export function usePlanDraft() {
  const [state, dispatch] = useReducer(
    planDraftReducer,
    undefined,
    createInitialPlanDraft
  );

  const selectedSubgoal = useMemo(
    () => state.subgoals.find((s) => s.id === state.selectedSubgoalId) ?? null,
    [state.subgoals, state.selectedSubgoalId]
  );

  const canAddSubgoal = state.subgoals.length < MAX_SUBGOALS;

  const saveGoalTitle = useCallback(
    (title: string) => dispatch({ type: "goal/save", title }),
    []
  );

  /** 追加できた場合は新しいサブゴールの ID を返す */
  const addSubgoal = useCallback(
    (title: string): string | null => {
      const trimmed = title.trim();
      if (!trimmed || !canAddSubgoal) return null;
      const subgoal = createSubgoal(trimmed);
      dispatch({ type: "subgoal/add", subgoal });
      return subgoal.id;
    },
    [canAddSubgoal]
  );

  const renameSubgoal = useCallback(
    (subgoalId: string, title: string) =>
      dispatch({ type: "subgoal/rename", subgoalId, title }),
    []
  );

  const deleteSubgoal = useCallback(
    (subgoalId: string) => dispatch({ type: "subgoal/delete", subgoalId }),
    []
  );

  const moveSubgoal = useCallback(
    (activeId: string, overId: string) =>
      dispatch({ type: "subgoal/move", activeId, overId }),
    []
  );

  const selectSubgoal = useCallback(
    (subgoalId: string) => dispatch({ type: "subgoal/select", subgoalId }),
    []
  );

  /** 追加できた場合は新しいタスクの ID を返す（フォーカス移動に使う） */
  const addTask = useCallback(
    (subgoalId: string): string | null => {
      const target = state.subgoals.find((s) => s.id === subgoalId);
      if (!target || target.tasks.length >= MAX_TASKS_PER_SUBGOAL) return null;
      const task = createEmptyTask();
      dispatch({ type: "task/add", subgoalId, task });
      return task.id;
    },
    [state.subgoals]
  );

  const renameTask = useCallback(
    (subgoalId: string, taskId: string, title: string) =>
      dispatch({ type: "task/rename", subgoalId, taskId, title }),
    []
  );

  const toggleTaskLoop = useCallback(
    (subgoalId: string, taskId: string) =>
      dispatch({ type: "task/toggleLoop", subgoalId, taskId }),
    []
  );

  const deleteTask = useCallback(
    (subgoalId: string, taskId: string) =>
      dispatch({ type: "task/delete", subgoalId, taskId }),
    []
  );

  const moveTask = useCallback(
    (subgoalId: string, activeId: string, overId: string) =>
      dispatch({ type: "task/move", subgoalId, activeId, overId }),
    []
  );

  return {
    goalTitle: state.goalTitle,
    subgoals: state.subgoals,
    selectedSubgoal,
    canAddSubgoal,
    saveGoalTitle,
    addSubgoal,
    renameSubgoal,
    deleteSubgoal,
    moveSubgoal,
    selectSubgoal,
    addTask,
    renameTask,
    toggleTaskLoop,
    deleteTask,
    moveTask,
  };
}

export type PlanDraft = ReturnType<typeof usePlanDraft>;
