import type { DraftSubgoal } from "@/features/plan/model/planDraft";

/** タイトル未入力のサブゴールにも表示名を与える */
export const subgoalLabel = (subgoal: DraftSubgoal, index: number) =>
  subgoal.title.trim() || `サブゴール${index + 1}`;
