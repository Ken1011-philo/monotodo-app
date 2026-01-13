import { supabase } from "@/lib/supabaseClient";
// verbatimModuleSyntax が有効なので type を付けます
import type { UUID } from "@/types/domain";
import { parseSupabaseError } from "@/lib/error";

export const taskRepository = {
  /**
   * タスクの完了状態を切り替える (RPC呼び出し)
   * 完了時: logs更新, goalsメトリクス更新などの副作用がDB側で走る
   */
  async completeTask(taskId: UUID, isCompleted: boolean): Promise<void> {
    const { error } = await supabase.rpc("monotodo_complete_task", {
      p_task_id: taskId,
      p_completed: isCompleted,
    });

    if (error) {
      throw parseSupabaseError(error);
    }
  },
};