// Plan ページの編集状態（ブラウザ内のみ）を扱う純粋なモデル。
// React や UI ライブラリに依存させず、DB 設計の刷新時はこの層ごと差し替えられるようにする。
// 完了状態の考え方: docs/specs/recurring-task-completion.md

import type { ActivityDate } from "./activityDate";

export const GOAL_TITLE_LIMIT = 255;
export const MAX_SUBGOALS = 30;
export const MAX_TASKS_PER_SUBGOAL = 30;

export type DraftTask = {
  id: string;
  title: string;
  isLoop: boolean;
  /** 一回タスクの完了日時（ISO 8601）。未完了なら null */
  completedAt: string | null;
  /** 定期タスクを完了した活動日の一覧（重複なし）。完了フラグは持たず、ここから計算する */
  doneOn: ActivityDate[];
  createdAt: number;
};

export type DraftSubgoal = {
  id: string;
  title: string;
  createdAt: number;
  tasks: DraftTask[];
};

export type PlanDraftState = {
  /** 保存済みの Goal タイトル（入力途中の値は GoalEditor 側で持つ） */
  goalTitle: string;
  /** 並び順 = 実行順。先頭のサブゴールが Do ページの対象になる */
  subgoals: DraftSubgoal[];
  selectedSubgoalId: string | null;
};

export type PlanDraftAction =
  | { type: "goal/save"; title: string }
  | { type: "subgoal/add"; subgoal: DraftSubgoal }
  | { type: "subgoal/rename"; subgoalId: string; title: string }
  | { type: "subgoal/delete"; subgoalId: string }
  | { type: "subgoal/move"; activeId: string; overId: string }
  | { type: "subgoal/select"; subgoalId: string }
  | { type: "task/add"; subgoalId: string; task: DraftTask }
  | { type: "task/rename"; subgoalId: string; taskId: string; title: string }
  // today / at は reducer を純粋に保つため呼び出し側（hook）が渡す
  | {
      type: "task/toggleLoop";
      subgoalId: string;
      taskId: string;
      today: ActivityDate;
      at: string;
    }
  | {
      type: "task/toggleComplete";
      subgoalId: string;
      taskId: string;
      today: ActivityDate;
      at: string;
    }
  | { type: "task/delete"; subgoalId: string; taskId: string }
  | { type: "task/move"; subgoalId: string; activeId: string; overId: string };

/* ---------------------------------------------------------
 * ファクトリ（ID と時刻を生成するため副作用あり。reducer の外で呼ぶ）
 * -------------------------------------------------------*/

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createSubgoal = (title: string): DraftSubgoal => ({
  id: createId("subgoal"),
  title,
  createdAt: Date.now(),
  tasks: [],
});

export const createEmptyTask = (): DraftTask => ({
  id: createId("task"),
  title: "",
  isLoop: false,
  completedAt: null,
  doneOn: [],
  createdAt: Date.now(),
});

export const createInitialPlanDraft = (): PlanDraftState => {
  const subgoal = createSubgoal("");
  subgoal.tasks = [createEmptyTask(), createEmptyTask()];
  return {
    goalTitle: "",
    subgoals: [subgoal],
    selectedSubgoalId: subgoal.id,
  };
};

/* ---------------------------------------------------------
 * 純粋関数
 * -------------------------------------------------------*/

/**
 * その活動日にタスクが完了しているか。
 * 定期タスクは「その日の完了記録があるか」で判定するため、日付が変わると自然に未完了へ戻る
 */
export function isTaskDone(task: DraftTask, today: ActivityDate): boolean {
  return task.isLoop ? task.doneOn.includes(today) : task.completedAt !== null;
}

/** サブゴールの進み具合（その活動日時点の完了数 / 全体数） */
export function subgoalProgress(subgoal: DraftSubgoal, today: ActivityDate) {
  const total = subgoal.tasks.length;
  const done = subgoal.tasks.filter((t) => isTaskDone(t, today)).length;
  return { done, total, isComplete: total > 0 && done === total };
}

/** 完了を切り替えた新しいタスクを返す */
function toggleDone(
  task: DraftTask,
  today: ActivityDate,
  at: string
): DraftTask {
  if (task.isLoop) {
    const doneOn = task.doneOn.includes(today)
      ? task.doneOn.filter((d) => d !== today)
      : [...task.doneOn, today];
    return { ...task, doneOn };
  }
  return { ...task, completedAt: task.completedAt ? null : at };
}

/**
 * 定期 / 一回を切り替えた新しいタスクを返す。
 * 画面に出ている完了状態（今日完了しているか）を切り替え後も引き継ぐ。過去の記録は消さない
 */
function toggleKind(
  task: DraftTask,
  today: ActivityDate,
  at: string
): DraftTask {
  const doneNow = isTaskDone(task, today);
  if (task.isLoop) {
    return { ...task, isLoop: false, completedAt: doneNow ? at : null };
  }
  const doneOn =
    doneNow && !task.doneOn.includes(today)
      ? [...task.doneOn, today]
      : task.doneOn;
  return {
    ...task,
    isLoop: true,
    doneOn: doneNow ? doneOn : task.doneOn.filter((d) => d !== today),
  };
}

/** activeId の要素を overId の位置へ移動した新しい配列を返す */
export function moveById<T extends { id: string }>(
  list: T[],
  activeId: string,
  overId: string
): T[] {
  const from = list.findIndex((item) => item.id === activeId);
  const to = list.findIndex((item) => item.id === overId);
  if (from === -1 || to === -1 || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** 削除後に選択すべきサブゴール（後ろ隣 → 前隣 → なし） */
function neighborAfterDelete(
  subgoals: DraftSubgoal[],
  deletedId: string
): string | null {
  const index = subgoals.findIndex((s) => s.id === deletedId);
  if (index === -1) return null;
  return subgoals[index + 1]?.id ?? subgoals[index - 1]?.id ?? null;
}

function updateSubgoal(
  state: PlanDraftState,
  subgoalId: string,
  update: (subgoal: DraftSubgoal) => DraftSubgoal
): PlanDraftState {
  return {
    ...state,
    subgoals: state.subgoals.map((s) => (s.id === subgoalId ? update(s) : s)),
  };
}

export function planDraftReducer(
  state: PlanDraftState,
  action: PlanDraftAction
): PlanDraftState {
  switch (action.type) {
    case "goal/save":
      if (action.title.length > GOAL_TITLE_LIMIT) return state;
      return { ...state, goalTitle: action.title };

    case "subgoal/add":
      if (state.subgoals.length >= MAX_SUBGOALS) return state;
      return {
        ...state,
        subgoals: [...state.subgoals, action.subgoal],
        selectedSubgoalId: action.subgoal.id,
      };

    case "subgoal/rename":
      return updateSubgoal(state, action.subgoalId, (s) => ({
        ...s,
        title: action.title,
      }));

    case "subgoal/delete": {
      const selectedSubgoalId =
        state.selectedSubgoalId === action.subgoalId
          ? neighborAfterDelete(state.subgoals, action.subgoalId)
          : state.selectedSubgoalId;
      return {
        ...state,
        subgoals: state.subgoals.filter((s) => s.id !== action.subgoalId),
        selectedSubgoalId,
      };
    }

    case "subgoal/move":
      return {
        ...state,
        subgoals: moveById(state.subgoals, action.activeId, action.overId),
      };

    case "subgoal/select":
      if (!state.subgoals.some((s) => s.id === action.subgoalId)) return state;
      return { ...state, selectedSubgoalId: action.subgoalId };

    case "task/add":
      return updateSubgoal(state, action.subgoalId, (s) =>
        s.tasks.length >= MAX_TASKS_PER_SUBGOAL
          ? s
          : { ...s, tasks: [...s.tasks, action.task] }
      );

    case "task/rename":
      return updateSubgoal(state, action.subgoalId, (s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === action.taskId ? { ...t, title: action.title } : t
        ),
      }));

    case "task/toggleLoop":
      return updateSubgoal(state, action.subgoalId, (s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === action.taskId ? toggleKind(t, action.today, action.at) : t
        ),
      }));

    case "task/toggleComplete":
      return updateSubgoal(state, action.subgoalId, (s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === action.taskId ? toggleDone(t, action.today, action.at) : t
        ),
      }));

    case "task/delete":
      return updateSubgoal(state, action.subgoalId, (s) => ({
        ...s,
        tasks: s.tasks.filter((t) => t.id !== action.taskId),
      }));

    case "task/move":
      return updateSubgoal(state, action.subgoalId, (s) => ({
        ...s,
        tasks: moveById(s.tasks, action.activeId, action.overId),
      }));
  }
}
