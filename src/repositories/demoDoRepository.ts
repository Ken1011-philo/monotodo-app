import type { DoRepo } from "@/types/domain";

/**
 * Supabaseを接続する前に画面遷移とUIを確認するための固定データです。
 */
export const demoDoRepository: DoRepo = {
  async getNextTask() {
    return {
      id: "demo-task",
      goalId: "demo-goal",
      subgoalId: "demo-subgoal",
      title: "MonoToDoの画面と操作を確認する",
      isLoop: false,
      subgoalTitle: "開発を再開する",
      subgoalOrder: 1,
      subgoalProgress: 25,
      taskOrder: 1,
    };
  },

  async getTodayStats() {
    return {
      totalTasks: 4,
      completedTasks: 1,
    };
  },
};
