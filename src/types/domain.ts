export type UUID = string;

export type TaskStatus = "pending" | "completed";

export interface Goal {
  id: UUID;
  title: string;
  // 統計情報
  currentStreak: number;
  completedNormalTaskCount: number;
  totalCompletedLoopTaskCount: number;
  // 統計情報ここまで
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

export interface NextTask {
  id: UUID;
  goalId: UUID;
  subgoalId: UUID;
  title: string;
  isLoop: boolean;   // ループタスク判定用
  subgoalTitle: string;    // 親サブゴール名
  subgoalOrder: number;    // 並び順
  subgoalProgress: number;
  taskOrder: number;
}

export interface TodayStats {
  totalTasks: number;
  completedTasks: number;
}

export interface DoRepo {
  getNextTask(): Promise<NextTask | null>;
  getTodayStats(): Promise<TodayStats | null>;
}

export interface UserSettings {
  userId: UUID;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  updatedAt: string;
}
