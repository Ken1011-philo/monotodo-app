export type UUID = string;

export type TaskStatus = "pending" | "completed";

export interface Goal {
  id: UUID;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subgoal {
  id: UUID;
  goalId: UUID;
  title: string;
  order: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: UUID;
  goalId: UUID;
  subgoalId: UUID;
  title: string;
  order: number;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TodayStats {
  totalTasks: number;
  completedTasks: number;
}

export interface DoRepo {
  getNextTask(): Promise<Task | null>;
  getTodayStats(): Promise<TodayStats | null>;
}
