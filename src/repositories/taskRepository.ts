import { supabase } from "@/lib/supabaseClient";
import type {
  LoopTaskTemplate,
  Task,
  UUID,
} from "@/types/domain";

type TaskRow = {
  id: string;
  user_id: string;
  subgoal_id: string;
  title: string;
  kind: "normal" | "loop_instance";
  completed: boolean;
  completed_at: string | null;
  sort_key: number;
  loop_template_id: string | null;
  activity_date: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
  sync_seq: number;
};

type LoopTemplateRow = {
  id: string;
  subgoal_id: string;
  user_id: string;
  title: string;
  sort_key: number;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
  sync_seq: number;
};

const mapTask = (row: TaskRow): Task => ({
  id: row.id,
  userId: row.user_id,
  goalId: "",
  subgoalId: row.subgoal_id,
  title: row.title,
  kind: row.kind,
  completed: row.completed,
  completedAt: row.completed_at,
  sortKey: row.sort_key,
  loopTemplateId: row.loop_template_id,
  activityDate: row.activity_date,
  deletedAt: row.deleted_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  revision: row.revision,
  syncSeq: row.sync_seq,
});

const mapLoopTemplate = (row: LoopTemplateRow): LoopTaskTemplate => ({
  id: row.id,
  subgoalId: row.subgoal_id,
  userId: row.user_id,
  title: row.title,
  sortKey: row.sort_key,
  isActive: row.is_active,
  deletedAt: row.deleted_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  revision: row.revision,
  syncSeq: row.sync_seq,
});

export const taskRepository = {
  async createPlanItem(input: {
    subgoalId: UUID;
    title: string;
    sortKey: number;
    isLoopTemplate: boolean;
  }): Promise<Task | LoopTaskTemplate> {
    if (input.isLoopTemplate) {
      const { data, error } = await supabase
        .from("loop_task_templates")
        .insert({
          subgoal_id: input.subgoalId,
          title: input.title,
          sort_key: input.sortKey,
          is_active: true,
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed to create loop task template: ${error.message}`);
      }
      return mapLoopTemplate(data as LoopTemplateRow);
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        subgoal_id: input.subgoalId,
        title: input.title,
        sort_key: input.sortKey,
        kind: "normal",
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
    return mapTask(data as TaskRow);
  },

  async updatePlanItemTitle(input: {
    itemId: UUID;
    title: string;
    isLoopTemplate: boolean;
    expectedRevision: number;
  }): Promise<Task | LoopTaskTemplate> {
    if (input.isLoopTemplate) {
      const { data, error } = await supabase
        .from("loop_task_templates")
        .update({ title: input.title })
        .eq("id", input.itemId)
        .eq("revision", input.expectedRevision)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed to update loop task template: ${error.message}`);
      }
      return mapLoopTemplate(data as LoopTemplateRow);
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ title: input.title })
      .eq("id", input.itemId)
      .eq("revision", input.expectedRevision)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
    return mapTask(data as TaskRow);
  },

  async movePlanItem(input: {
    itemId: UUID;
    subgoalId: UUID;
    targetSortKey: number;
    isLoopTemplate: boolean;
  }): Promise<Task[] | LoopTaskTemplate[]> {
    if (input.isLoopTemplate) {
      const { error } = await supabase
        .from("loop_task_templates")
        .update({ sort_key: input.targetSortKey })
        .eq("id", input.itemId);

      if (error) {
        throw new Error(`Failed to move loop task template: ${error.message}`);
      }

      const { data, error: fetchError } = await supabase
        .from("loop_task_templates")
        .select("*")
        .eq("subgoal_id", input.subgoalId)
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("sort_key", { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to reload loop task templates: ${fetchError.message}`);
      }
      return (data ?? []).map((row) => mapLoopTemplate(row as LoopTemplateRow));
    }

    const { error } = await supabase
      .from("tasks")
      .update({ sort_key: input.targetSortKey })
      .eq("id", input.itemId);

    if (error) {
      throw new Error(`Failed to move task: ${error.message}`);
    }

    const { data, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("subgoal_id", input.subgoalId)
      .is("deleted_at", null)
      .order("sort_key", { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to reload tasks: ${fetchError.message}`);
    }
    return (data ?? []).map((row) => mapTask(row as TaskRow));
  },

  async deletePlanItem(input: {
    itemId: UUID;
    subgoalId: UUID;
    isLoopTemplate: boolean;
    expectedRevision: number;
  }): Promise<void> {
    const deleted_at = new Date().toISOString();
    const table = input.isLoopTemplate ? "loop_task_templates" : "tasks";

    const { error } = await supabase
      .from(table)
      .update({ deleted_at })
      .eq("id", input.itemId)
      .eq("revision", input.expectedRevision);

    if (error) {
      throw new Error(`Failed to delete item: ${error.message}`);
    }
  },

  async convertLoopTemplateToTask(input: {
    loopTemplateId: UUID;
    title?: string;
  }): Promise<Task> {
    const { data: template, error: fetchError } = await supabase
      .from("loop_task_templates")
      .select("*")
      .eq("id", input.loopTemplateId)
      .single();

    if (fetchError || !template) {
      throw new Error(`Loop task template not found: ${fetchError?.message ?? ""}`.trim());
    }

    const templateRow = template as LoopTemplateRow;

    const deactivatedAt = new Date().toISOString();
    const { error: deactivateError } = await supabase
      .from("loop_task_templates")
      .update({ is_active: false, deleted_at: deactivatedAt })
      .eq("id", input.loopTemplateId);

    if (deactivateError) {
      throw new Error(`Failed to deactivate loop template: ${deactivateError.message}`);
    }

    const { data: created, error: createError } = await supabase
      .from("tasks")
      .insert({
        subgoal_id: templateRow.subgoal_id,
        title: input.title ?? templateRow.title,
        sort_key: templateRow.sort_key,
        kind: "normal",
      })
      .select("*")
      .single();

    if (createError) {
      throw new Error(`Failed to create task from template: ${createError.message}`);
    }

    return mapTask(created as TaskRow);
  },

  async setLoopTemplateActive(input: {
    loopTemplateId: UUID;
    isActive: boolean;
    expectedRevision: number;
  }): Promise<LoopTaskTemplate> {
    const { data, error } = await supabase
      .from("loop_task_templates")
      .update({ is_active: input.isActive })
      .eq("id", input.loopTemplateId)
      .eq("revision", input.expectedRevision)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update loop template active flag: ${error.message}`);
    }
    return mapLoopTemplate(data as LoopTemplateRow);
  },
};

export type TaskRepository = typeof taskRepository;
=======
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
