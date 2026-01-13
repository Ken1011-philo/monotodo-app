import { supabase } from "@/lib/supabaseClient";
import type { Goal } from "@/types/domain";
import { parseSupabaseError } from "@/lib/error";

export const goalRepository = {
  /**
   * ユーザーの現在のGoal情報を取得
   * Streakや累計完了数などのメトリクスも含む
   */
  async getGoal(): Promise<Goal | null> {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .single(); // RLSにより自分のレコード1件のみが返る

    if (error) {
      // まだGoalが作成されていない場合 (PGRST116: JSON object requested, multiple (or no) rows returned)
      if (error.code === "PGRST116") {
        return null;
      }
      throw parseSupabaseError(error);
    }

    // DB(snake_case) から Domain(camelCase) への変換
    return {
      id: data.id,
      title: data.title,
      currentStreak: data.current_streak,
      completedNormalTaskCount: data.completed_normal_task_count,
      totalCompletedLoopTaskCount: data.total_completed_loop_task_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },
};