export type UUID = string;

export type TaskStatus = "pending" | "completed";
export type SubgoalCompletionMode = "auto" | "manual";
export type TaskKind = "normal" | "loop_instance";

export interface Goal {
  id: UUID;
  userId: UUID;
  title: string;
  completedNormalTaskCount: number;
  totalCompletedLoopTaskCount: number;
  currentStreak: number;
  lastAggregatedDate: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  syncSeq: number;
}

export interface Subgoal {
  id: UUID;
  goalId: UUID;
  userId: UUID;
  title: string;
  sortKey: number;
  completionMode: SubgoalCompletionMode;
  manualCompleted: boolean;
  completed: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  syncSeq: number;
}

export interface LoopTaskTemplate {
  id: UUID;
  subgoalId: UUID;
  userId: UUID;
  title: string;
  sortKey: number;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  syncSeq: number;
}

export interface Task {
  id: UUID;
  userId: UUID;
  goalId: UUID;
  subgoalId: UUID;
  title: string;
  kind: TaskKind;
  completed: boolean;
  completedAt: string | null;
  sortKey: number;
  loopTemplateId: UUID | null;
  activityDate: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  syncSeq: number;
}

export interface PlanSubgoalNode extends Subgoal {
  tasks: Task[];
  loopTaskTemplates: LoopTaskTemplate[];
}

export interface TodayStats {
  totalTasks: number;
  completedTasks: number;
}

export interface DoRepo {
  getNextTask(): Promise<Task | null>;
  getTodayStats(): Promise<TodayStats | null>;
}

export interface PlanRepository {
  fetchPlan(): Promise<{ goal: Goal | null; subgoals: PlanSubgoalNode[] }>;
  saveGoalTitle(input: {
    title: string;
    expectedRevision: number | null;
  }): Promise<Goal>;

  createSubgoal(input: { title: string; sortKey: number }): Promise<Subgoal>;
  updateSubgoalTitle(input: {
    subgoalId: UUID;
    title: string;
    expectedRevision: number;
  }): Promise<Subgoal>;
  setSubgoalManualCompleted(input: {
    subgoalId: UUID;
    manualCompleted: boolean;
    expectedRevision: number;
  }): Promise<Subgoal>;
  deleteSubgoal(input: { subgoalId: UUID; expectedRevision: number }): Promise<void>;
  moveSubgoal(input: {
    subgoalId: UUID;
    targetSortKey: number;
  }): Promise<Subgoal[]>;

  createPlanItem(input: {
    subgoalId: UUID;
    title: string;
    sortKey: number;
    isLoopTemplate: boolean;
  }): Promise<Task | LoopTaskTemplate>;
  updatePlanItemTitle(input: {
    itemId: UUID;
    title: string;
    isLoopTemplate: boolean;
    expectedRevision: number;
  }): Promise<Task | LoopTaskTemplate>;
  movePlanItem(input: {
    itemId: UUID;
    subgoalId: UUID;
    targetSortKey: number;
    isLoopTemplate: boolean;
  }): Promise<Task[] | LoopTaskTemplate[]>;
  deletePlanItem(input: {
    itemId: UUID;
    subgoalId: UUID;
    isLoopTemplate: boolean;
    expectedRevision: number;
  }): Promise<void>;

  convertLoopTemplateToTask(input: {
    loopTemplateId: UUID;
    title?: string;
  }): Promise<Task>;
  setLoopTemplateActive(input: {
    loopTemplateId: UUID;
    isActive: boolean;
    expectedRevision: number;
  }): Promise<LoopTaskTemplate>;
}
