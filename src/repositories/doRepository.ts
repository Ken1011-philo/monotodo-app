import { supabase } from "@/lib/supabaseClient";
import type { DoRepo, Task, TodayStats } from "@/types/domain";
import { assert } from "@/lib/utils";
import { parseSupabaseError } from "@/lib/error.ts";

// 「今日」を取得するヘルパー
const getJstDateString = () => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
};

export const doRepository: DoRepo = {
  /**
   * 次にやるべきタスクを取得
   * RPC: monotodo_select_next_task
   */
  async getNextTask(): Promise<Task | null> {
    // 1. 集計を実行
    const { error: aggError } = await supabase.rpc(
      "monotodo_aggregate_missing_days"
    );
    if (aggError) throw parseSupabaseError(aggError);

    // 2. 次のタスクを取得
    const { data, error } = await supabase.rpc("monotodo_select_next_task");
    if (error) throw parseSupabaseError(error);

    if (!data || data.length === 0) {
      return null;
    }

    const row = data[0];

    assert(row.task_id, "Task ID is missing from RPC response");

    // 3. Domain型へマッピング
    return {
      id: row.task_id,
      goalId: "", // RPCに含まれないため空文字で埋める
      subgoalId: row.subgoal_id,
      title: row.task_title,
      order: row.task_order,
      status: "pending",
      createdAt: "",
      updatedAt: "",
    };
  },

  /**
   * 今日の進捗統計を取得
   */
  async getTodayStats(): Promise<TodayStats | null> {
    const today = getJstDateString();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) return null;

    // A. 今日のログを取得 (完了数)
    const { data: logData, error: logError } = await supabase
      .from("task_completion_logs")
      .select("completion_counter")
      .eq("user_id", userId)
      .eq("activity_date", today)
      .maybeSingle();

    if (logError) throw parseSupabaseError(logError);

    const completedCount = logData?.completion_counter ?? 0;

    // B. 残タスク数を取得
    const { count: pendingCount, error: countError } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", false);

    if (countError) throw parseSupabaseError(countError);

    return {
      completedTasks: completedCount,
      totalTasks: (pendingCount ?? 0) + completedCount,
    };
  },
};