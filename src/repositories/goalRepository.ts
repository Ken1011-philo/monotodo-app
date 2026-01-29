import { supabase } from "@/lib/supabaseClient";
import type {
  Goal,
  PlanSubgoalNode,
  Subgoal,
  Task,
  LoopTaskTemplate,
  UUID,
} from "@/types/domain";

type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  completed_normal_task_count: number;
  total_completed_loop_task_count: number;
  current_streak: number;
  last_aggregated_date: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
  sync_seq: number;
};

type SubgoalRow = {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  sort_key: number;
  completion_mode: "auto" | "manual";
  manual_completed: boolean;
  completed: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
  sync_seq: number;
};

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

const mapGoal = (row: GoalRow): Goal => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  completedNormalTaskCount: row.completed_normal_task_count,
  totalCompletedLoopTaskCount: row.total_completed_loop_task_count,
  currentStreak: row.current_streak,
  lastAggregatedDate: row.last_aggregated_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  revision: row.revision,
  syncSeq: row.sync_seq,
});

const mapSubgoal = (row: SubgoalRow): Subgoal => ({
  id: row.id,
  goalId: row.goal_id,
  userId: row.user_id,
  title: row.title,
  sortKey: row.sort_key,
  completionMode: row.completion_mode,
  manualCompleted: row.manual_completed,
  completed: row.completed,
  deletedAt: row.deleted_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  revision: row.revision,
  syncSeq: row.sync_seq,
});

// tasks table does not store goal_id; callers should inject it from the parent subgoal.
const mapTask = (row: TaskRow, goalId?: UUID): Task => ({
  id: row.id,
  userId: row.user_id,
  goalId: goalId ?? "",
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

async function getOrCreateGoalId(): Promise<UUID> {
  const { data, error } = await supabase.rpc("monotodo_get_or_create_goal_id");
  if (error) {
    throw new Error(`Failed to get goal id: ${error.message}`);
  }
  return data as UUID;
}

async function fetchSubgoalTree(goalId: UUID): Promise<PlanSubgoalNode[]> {
  const { data: subgoals, error: subgoalError } = await supabase
    .from("subgoals")
    .select("*")
    .eq("goal_id", goalId)
    .is("deleted_at", null)
    .order("sort_key", { ascending: true });

  if (subgoalError) {
    throw new Error(`Failed to fetch subgoals: ${subgoalError.message}`);
  }

  const subgoalIds = (subgoals ?? []).map((row) => row.id);
  if (subgoalIds.length === 0) return [];

  const [
    { data: tasks, error: taskError },
    { data: loopTemplates, error: loopError },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .in("subgoal_id", subgoalIds)
      .is("deleted_at", null)
      .order("sort_key", { ascending: true }),
    supabase
      .from("loop_task_templates")
      .select("*")
      .in("subgoal_id", subgoalIds)
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("sort_key", { ascending: true }),
  ]);

  if (taskError) {
    throw new Error(`Failed to fetch tasks: ${taskError.message}`);
  }
  if (loopError) {
    throw new Error(
      `Failed to fetch loop task templates: ${loopError.message}`,
    );
  }

  return (subgoals ?? []).map((row) => {
    const relatedTasks = (tasks ?? []).filter(
      (task) => task.subgoal_id === row.id,
    );
    const relatedLoops = (loopTemplates ?? []).filter(
      (loop) => loop.subgoal_id === row.id,
    );
    const goalId = row.goal_id as UUID;
    return {
      ...mapSubgoal(row as SubgoalRow),
      tasks: relatedTasks.map((task) => mapTask(task as TaskRow, goalId)),
      loopTaskTemplates: relatedLoops.map((loop) =>
        mapLoopTemplate(loop as LoopTemplateRow),
      ),
    };
  });
}

export const goalRepository = {
  async fetchPlan(): Promise<{
    goal: Goal | null;
    subgoals: PlanSubgoalNode[];
  }> {
    const goalId = await getOrCreateGoalId();
    const { data: goalRow, error: goalError } = await supabase
      .from("goals")
      .select("*")
      .eq("id", goalId)
      .single();

    if (goalError) {
      throw new Error(`Failed to fetch goal: ${goalError.message}`);
    }

    const subgoals = await fetchSubgoalTree(goalId);
    return { goal: goalRow ? mapGoal(goalRow as GoalRow) : null, subgoals };
  },

  async saveGoalTitle(input: {
    title: string;
    expectedRevision: number | null;
  }): Promise<Goal> {
    const goalId = await getOrCreateGoalId();
    const { data, error } = await supabase
      .rpc("monotodo_update_goal_title", {
        p_title: input.title,
        p_expected_revision: input.expectedRevision ?? null,
      })
      .single();

    if (error) {
      const isConflict =
        error.message?.includes("MONOTODO_CONFLICT") ||
        error.details?.includes("MONOTODO_CONFLICT") ||
        error.code === "P0001";

      if (isConflict) {
        const { data: current, error: fetchError } = await supabase
          .from("goals")
          .select("*")
          .eq("id", goalId)
          .single();

        if (fetchError) {
          throw new Error(
            `Failed to reload goal after conflict: ${fetchError.message}`,
          );
        }

        throw new Error(
          `Failed to save goal title: conflict detected (current revision ${current.revision})`,
        );
      }

      throw new Error(`Failed to save goal title: ${error.message}`);
    }

    return mapGoal(data as GoalRow);
  },

  async createSubgoal(input: {
    title: string;
    sortKey: number;
  }): Promise<Subgoal> {
    const { data, error } = await supabase
      .rpc("monotodo_create_subgoal", {
        p_title: input.title,
        p_sort_key: input.sortKey,
      })
      .single();

    if (error) {
      throw new Error(`Failed to create subgoal: ${error.message}`);
    }
    return mapSubgoal(data as SubgoalRow);
  },

  async updateSubgoalTitle(input: {
    subgoalId: UUID;
    title: string;
    expectedRevision: number;
  }): Promise<Subgoal> {
    const { data, error } = await supabase
      .from("subgoals")
      .update({ title: input.title })
      .eq("id", input.subgoalId)
      .eq("revision", input.expectedRevision)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update subgoal title: ${error.message}`);
    }
    return mapSubgoal(data as SubgoalRow);
  },

  async setSubgoalManualCompleted(input: {
    subgoalId: UUID;
    manualCompleted: boolean;
    expectedRevision: number;
  }): Promise<Subgoal> {
    const { data, error } = await supabase
      .from("subgoals")
      .update({
        manual_completed: input.manualCompleted,
        completion_mode: "manual",
      })
      .eq("id", input.subgoalId)
      .eq("revision", input.expectedRevision)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to toggle manual completion: ${error.message}`);
    }
    return mapSubgoal(data as SubgoalRow);
  },

  async deleteSubgoal(input: {
    subgoalId: UUID;
    expectedRevision: number;
  }): Promise<void> {
    const { error } = await supabase
      .from("subgoals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", input.subgoalId)
      .eq("revision", input.expectedRevision);

    if (error) {
      throw new Error(`Failed to delete subgoal: ${error.message}`);
    }
  },

  async moveSubgoal(input: {
    subgoalId: UUID;
    targetSortKey: number;
  }): Promise<Subgoal[]> {
    const { error } = await supabase
      .from("subgoals")
      .update({ sort_key: input.targetSortKey })
      .eq("id", input.subgoalId);

    if (error) {
      throw new Error(`Failed to move subgoal: ${error.message}`);
    }

    const { data: rows, error: fetchError } = await supabase
      .from("subgoals")
      .select("*")
      .is("deleted_at", null)
      .order("sort_key", { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to reload subgoals: ${fetchError.message}`);
    }

    return (rows ?? []).map((row) => mapSubgoal(row as SubgoalRow));
  },
};

export type GoalRepository = typeof goalRepository;
