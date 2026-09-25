// Plan ページの編集状態（ブラウザ内のみ）を扱う純粋なモデル。
// React や UI ライブラリに依存させず、DB 設計の刷新時はこの層ごと差し替えられるようにする。

export const GOAL_TITLE_LIMIT = 255;
export const MAX_SUBGOALS = 30;
export const MAX_TASKS_PER_SUBGOAL = 30;

export type DraftTask = {
  id: string;
  title: string;
  isLoop: boolean;
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
  | { type: "task/toggleLoop"; subgoalId: string; taskId: string }
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
          t.id === action.taskId ? { ...t, isLoop: !t.isLoop } : t
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
