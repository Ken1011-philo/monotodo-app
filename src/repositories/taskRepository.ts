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
        .rpc("monotodo_create_loop_task_template", {
          p_subgoal_id: input.subgoalId,
          p_title: input.title,
          p_sort_key: input.sortKey,
        })
        .single();

      if (error) {
        throw new Error(`Failed to create loop task template: ${error.message}`);
      }
      return mapLoopTemplate(data as LoopTemplateRow);
    }

    const { data, error } = await supabase
      .rpc("monotodo_create_task", {
        p_subgoal_id: input.subgoalId,
        p_title: input.title,
        p_sort_key: input.sortKey,
      })
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
        .rpc("monotodo_update_loop_task_template_title", {
          p_template_id: input.itemId,
          p_title: input.title,
          p_expected_revision: input.expectedRevision,
        })
        .single();

      if (error) {
        throw new Error(`Failed to update loop task template: ${error.message}`);
      }
      return mapLoopTemplate(data as LoopTemplateRow);
    }

    const { data, error } = await supabase
      .rpc("monotodo_update_task_title", {
        p_task_id: input.itemId,
        p_title: input.title,
        p_expected_revision: input.expectedRevision,
      })
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
      const { data, error } = await supabase.rpc("monotodo_move_loop_task_template", {
        p_template_id: input.itemId,
        p_target_sort_key: input.targetSortKey,
      });

      if (error) {
        throw new Error(`Failed to move loop task template: ${error.message}`);
      }
      return (data ?? []).map((row: unknown) => mapLoopTemplate(row as LoopTemplateRow));
    }

    const { data, error } = await supabase.rpc("monotodo_move_task", {
      p_task_id: input.itemId,
      p_target_sort_key: input.targetSortKey,
    });

    if (error) {
      throw new Error(`Failed to move task: ${error.message}`);
    }
    return (data ?? []).map((row: unknown) => mapTask(row as TaskRow));
  },

  async deletePlanItem(input: {
    itemId: UUID;
    subgoalId: UUID;
    isLoopTemplate: boolean;
    expectedRevision: number;
  }): Promise<void> {
    if (input.isLoopTemplate) {
      const { error } = await supabase.rpc("monotodo_delete_loop_task_template", {
        p_template_id: input.itemId,
        p_expected_revision: input.expectedRevision,
      });
      if (error) throw new Error(`Failed to delete item: ${error.message}`);
      return;
    }

    const { error } = await supabase.rpc("monotodo_delete_task", {
      p_task_id: input.itemId,
      p_expected_revision: input.expectedRevision,
    });
    if (error) throw new Error(`Failed to delete item: ${error.message}`);
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
