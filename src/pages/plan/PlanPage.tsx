import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const GOAL_TITLE_LIMIT = 255;
const MAX_SUBGOALS = 30;
const MAX_TASKS_PER_SUBGOAL = 30;

type TaskItem = {
  id: string;
  title: string;
  isLoop: boolean;
  createdAt: number;
};

type Subgoal = {
  id: string;
  title: string;
  createdAt: number;
  tasks: TaskItem[];
};

const seededSubgoals: Subgoal[] = [
  {
    id: "seed-research",
    title: "リサーチ方針を固める",
    createdAt: 1,
    tasks: [
      { id: "seed-research-1", title: "既存アプリ調査", isLoop: false, createdAt: 1 },
      { id: "seed-research-2", title: "競合のPlan導線をスクショ", isLoop: true, createdAt: 2 },
    ],
  },
  {
    id: "seed-plan",
    title: "週次ブロックの洗い出し",
    createdAt: 2,
    tasks: [
      { id: "seed-plan-1", title: "月〜金の時間割を整理", isLoop: false, createdAt: 1 },
      { id: "seed-plan-2", title: "リピート化したい家事を列挙", isLoop: true, createdAt: 2 },
    ],
  },
  {
    id: "seed-scope",
    title: "対象タスクの粒度を決める",
    createdAt: 3,
    tasks: [
      { id: "seed-scope-1", title: "通常タスクの粒度ルールをメモ", isLoop: false, createdAt: 1 },
    ],
  },
];

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

export default function PlanPage() {
  return (
    <section className="space-y-8 rounded-3xl border border-border/80 bg-card/70 p-8 shadow-sm">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Plan</p>
        <h1 className="text-3xl font-semibold">Goal / Subgoal 設計</h1>
        <p className="text-sm text-muted-foreground">
          Supabase 連携前に、Plan ページの入力体験を整備しています。ここで確定した情報が Do / Focus へ流れます。
        </p>
      </header>

      <div className="space-y-8">
        <GoalInputSection />
        <SubgoalListSection />
      </div>
    </section>
  );
}

function GoalInputSection() {
  const [goalTitle, setGoalTitle] = useState("");
  const [savedGoalTitle, setSavedGoalTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const goalError =
    goalTitle.length > GOAL_TITLE_LIMIT
      ? `Goalタイトルは${GOAL_TITLE_LIMIT}文字以内に収めてください`
      : null;
  const isDirty = goalTitle !== savedGoalTitle;

  function handleGoalSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (goalError || !isDirty) return;
    setIsSaving(true);
    setTimeout(() => {
      setSavedGoalTitle(goalTitle);
      setIsSaving(false);
      setLastSavedAt(new Date());
    }, 200);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-background/60 p-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Goal Title
        </p>
        <h2 className="text-2xl font-semibold">今やる 1 つのテーマを 1 行で明文化</h2>
        <p className="text-sm text-muted-foreground">
          タイトルは空でも構いません。ただし、Do ページの誘導とメトリクス整理のために、短くても言語化しておくのがおすすめです。
        </p>
      </header>

      <form onSubmit={handleGoalSubmit} className="space-y-3">
        <Input
          value={goalTitle}
          onChange={(event) => setGoalTitle(event.target.value)}
          placeholder="例：司法試験に合格する（空欄でもOK）"
          aria-invalid={goalError ? "true" : "false"}
          autoComplete="off"
        />

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <p className="text-muted-foreground">1 行のみ入力可。重要キーワードの抜き出しを意識しましょう。</p>
          <span className="ml-auto font-mono text-muted-foreground">
            {goalTitle.length}/{GOAL_TITLE_LIMIT}
          </span>
        </div>

        {goalError ? (
          <p className="text-xs font-medium text-destructive">{goalError}</p>
        ) : lastSavedAt ? (
          <p className="text-xs text-emerald-600">{lastSavedAt.toLocaleTimeString()} にローカル保存しました</p>
        ) : (
          <p className="text-xs text-muted-foreground">空欄のままでも保存可能です。</p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={!isDirty || Boolean(goalError) || isSaving} className="min-w-[140px]">
            <Save className="size-4" />
            {isSaving ? "保存中…" : "Goal を保存"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setGoalTitle("")} disabled={!goalTitle}>
            クリア
          </Button>
        </div>
      </form>
    </section>
  );
}

function SubgoalListSection() {
  const [subgoals, setSubgoals] = useState<Subgoal[]>(seededSubgoals);
  const [draftTitle, setDraftTitle] = useState("");
  const [draggingSubgoalId, setDraggingSubgoalId] = useState<string | null>(null);
  const [draggingTask, setDraggingTask] = useState<{ subgoalId: string; taskId: string } | null>(null);
  const [pendingTaskFocusId, setPendingTaskFocusId] = useState<string | null>(null);
  const taskInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map<string, HTMLInputElement | null>());

  const limitReached = subgoals.length >= MAX_SUBGOALS;
  const trimmedDraft = draftTitle.trim();
  const canSubmitDraft = Boolean(trimmedDraft) && !limitReached;

  const helperText = useMemo(() => {
    if (limitReached) {
      return "Subgoal は 30 件が上限です。削除してから追加してください。";
    }
    return "Enter または追加ボタンで新しい Subgoal を末尾に挿入できます。";
  }, [limitReached]);

  useEffect(() => {
    if (!pendingTaskFocusId) return;
    const nextInput = taskInputRefs.current.get(pendingTaskFocusId);
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
      setPendingTaskFocusId(null);
    }
  }, [pendingTaskFocusId, subgoals]);

  const registerTaskInput = useCallback((taskId: string) => {
    return (element: HTMLInputElement | null) => {
      const map = taskInputRefs.current;
      if (element) {
        map.set(taskId, element);
      } else {
        map.delete(taskId);
      }
    };
  }, []);

  function addSubgoal() {
    if (!canSubmitDraft) return;
    const newSubgoal: Subgoal = {
      id: createId("subgoal"),
      title: trimmedDraft,
      createdAt: Date.now(),
      tasks: [],
    };
    setSubgoals((prev) => [...prev, newSubgoal]);
    setDraftTitle("");
  }

  function handleDraftKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    if (limitReached) {
      event.preventDefault();
      return;
    }
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    addSubgoal();
  }

  function handleDeleteSubgoal(id: string) {
    setSubgoals((prev) => prev.filter((subgoal) => subgoal.id !== id));
  }

  function updateSubgoalTitle(id: string, value: string) {
    setSubgoals((prev) =>
      prev.map((subgoal) => (subgoal.id === id ? { ...subgoal, title: value } : subgoal))
    );
  }

  function addTaskRow(subgoalId: string) {
    let createdTaskId: string | null = null;
    setSubgoals((prev) =>
      prev.map((subgoal) => {
        if (subgoal.id !== subgoalId) return subgoal;
        if (subgoal.tasks.length >= MAX_TASKS_PER_SUBGOAL) return subgoal;
        const newTask: TaskItem = {
          id: createId("task"),
          title: "",
          isLoop: false,
          createdAt: Date.now(),
        };
        createdTaskId = newTask.id;
        return { ...subgoal, tasks: [...subgoal.tasks, newTask] };
      })
    );
    if (createdTaskId) {
      setPendingTaskFocusId(createdTaskId);
    }
  }

  function handleSubgoalTitleKeyDown(event: React.KeyboardEvent<HTMLInputElement>, subgoal: Subgoal) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    addTaskRow(subgoal.id);
  }

  function handleTaskTitleChange(subgoalId: string, taskId: string, value: string) {
    setSubgoals((prev) =>
      prev.map((subgoal) => {
        if (subgoal.id !== subgoalId) return subgoal;
        return {
          ...subgoal,
          tasks: subgoal.tasks.map((task) =>
            task.id === taskId ? { ...task, title: value } : task
          ),
        };
      })
    );
  }

  function handleTaskKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    subgoalId: string,
    _taskId: string
  ) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    addTaskRow(subgoalId);
  }

  function toggleTaskLoop(subgoalId: string, taskId: string) {
    setSubgoals((prev) =>
      prev.map((subgoal) => {
        if (subgoal.id !== subgoalId) return subgoal;
        return {
          ...subgoal,
          tasks: subgoal.tasks.map((task) =>
            task.id === taskId ? { ...task, isLoop: !task.isLoop } : task
          ),
        };
      })
    );
  }

  function deleteTask(subgoalId: string, taskId: string) {
    setSubgoals((prev) =>
      prev.map((subgoal) => {
        if (subgoal.id !== subgoalId) return subgoal;
        return {
          ...subgoal,
          tasks: subgoal.tasks.filter((task) => task.id !== taskId),
        };
      })
    );
  }

  function handleSubgoalDragStart(event: React.DragEvent<HTMLLIElement>, id: string) {
    setDraggingSubgoalId(id);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleSubgoalDrop(event: React.DragEvent<HTMLLIElement>, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    if (!draggingSubgoalId || draggingSubgoalId === targetId) {
      setDraggingSubgoalId(null);
      return;
    }

    setSubgoals((prev) => {
      const updated = [...prev];
      const sourceIndex = updated.findIndex((item) => item.id === draggingSubgoalId);
      const targetIndex = updated.findIndex((item) => item.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
    setDraggingSubgoalId(null);
  }

  function handleTaskDragStart(
    event: React.DragEvent<HTMLLIElement>,
    subgoalId: string,
    taskId: string
  ) {
    setDraggingTask({ subgoalId, taskId });
    event.dataTransfer.effectAllowed = "move";
  }

  function handleTaskDrop(
    event: React.DragEvent<HTMLLIElement>,
    subgoalId: string,
    targetTaskId: string
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (!draggingTask || draggingTask.subgoalId !== subgoalId) {
      setDraggingTask(null);
      return;
    }
    if (draggingTask.taskId === targetTaskId) {
      setDraggingTask(null);
      return;
    }

    setSubgoals((prev) =>
      prev.map((subgoal) => {
        if (subgoal.id !== subgoalId) return subgoal;
        const updated = [...subgoal.tasks];
        const sourceIndex = updated.findIndex((task) => task.id === draggingTask.taskId);
        const targetIndex = updated.findIndex((task) => task.id === targetTaskId);
        if (sourceIndex === -1 || targetIndex === -1) {
          return subgoal;
        }
        const [moved] = updated.splice(sourceIndex, 1);
        updated.splice(targetIndex, 0, moved);
        return { ...subgoal, tasks: updated };
      })
    );
    setDraggingTask(null);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-background/60 p-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Subgoal List</p>
        <h2 className="text-2xl font-semibold">サブゴールとタスクを Drag & Drop で制御</h2>
        <p className="text-sm text-muted-foreground">
          並べ替えはドラッグ＆ドロップ、Enter 操作で新規タスク行を追加します。サーバー側でも order を正規化する前提で、UI 制約も 30 件上限に合わせています。
        </p>
      </header>

      <ol className="space-y-4">
        {subgoals.map((subgoal, index) => {
          const isDragging = draggingSubgoalId === subgoal.id;
          const taskLimitReached = subgoal.tasks.length >= MAX_TASKS_PER_SUBGOAL;
          return (
            <li
              key={subgoal.id}
              draggable
              onDragStart={(event) => handleSubgoalDragStart(event, subgoal.id)}
              onDragEnd={() => setDraggingSubgoalId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleSubgoalDrop(event, subgoal.id)}
              className={cn(
                "space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4 transition",
                isDragging && "opacity-70 ring-2 ring-primary/40"
              )}
              aria-grabbed={isDragging}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <button
                  type="button"
                  className="order-2 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 sm:order-1"
                  aria-label="サブゴールの並び替えハンドル"
                >
                  <GripVertical className="size-5" />
                </button>
                <div className="order-1 flex-1 space-y-2 sm:order-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>
                      {index + 1}. Subgoal
                    </span>
                    <span>
                      Tasks {subgoal.tasks.length}/{MAX_TASKS_PER_SUBGOAL}
                    </span>
                  </div>
                  <Input
                    value={subgoal.title}
                    onChange={(event) => updateSubgoalTitle(subgoal.id, event.target.value)}
                    onKeyDown={(event) => handleSubgoalTitleKeyDown(event, subgoal)}
                    placeholder="サブゴールタイトル（例：章ごとに要点整理）"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter で新規タスク行が末尾に追加され、入力フォーカスが移動します。
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDeleteSubgoal(subgoal.id)}
                  aria-label={`${subgoal.title || "サブゴール"}を削除`}
                  className="order-3 self-start text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <TaskList
                subgoal={subgoal}
                registerTaskInput={registerTaskInput}
                draggingTask={draggingTask}
                onTaskDragStart={handleTaskDragStart}
                onTaskDrop={handleTaskDrop}
                onTaskDragEnd={() => setDraggingTask(null)}
                onTaskTitleChange={handleTaskTitleChange}
                onTaskKeyDown={handleTaskKeyDown}
                onToggleLoop={toggleTaskLoop}
                onDeleteTask={deleteTask}
                taskLimitReached={taskLimitReached}
                onAddTask={() => addTaskRow(subgoal.id)}
              />
            </li>
          );
        })}

        {subgoals.length === 0 && (
          <li className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Subgoal を追加するとここに表示されます。
          </li>
        )}
      </ol>

      <div className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={handleDraftKeyDown}
            placeholder={limitReached ? "上限に達しています" : "例：『章ごとに要点整理』など"}
            disabled={limitReached}
            aria-disabled={limitReached}
          />
          <Button type="button" onClick={addSubgoal} disabled={!canSubmitDraft} className="sm:min-w-[160px]">
            <Plus className="size-4" />
            Subgoal を追加
          </Button>
        </div>
        <p className={cn("text-xs", limitReached ? "text-destructive" : "text-muted-foreground")}>
          {helperText}（{subgoals.length}/{MAX_SUBGOALS}）
        </p>
      </div>
    </section>
  );
}

type TaskListProps = {
  subgoal: Subgoal;
  registerTaskInput: (taskId: string) => (element: HTMLInputElement | null) => void;
  draggingTask: { subgoalId: string; taskId: string } | null;
  onTaskDragStart: (event: React.DragEvent<HTMLLIElement>, subgoalId: string, taskId: string) => void;
  onTaskDrop: (event: React.DragEvent<HTMLLIElement>, subgoalId: string, taskId: string) => void;
  onTaskDragEnd: () => void;
  onTaskTitleChange: (subgoalId: string, taskId: string, value: string) => void;
  onTaskKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
    subgoalId: string,
    taskId: string
  ) => void;
  onToggleLoop: (subgoalId: string, taskId: string) => void;
  onDeleteTask: (subgoalId: string, taskId: string) => void;
  taskLimitReached: boolean;
  onAddTask: () => void;
};

function TaskList({
  subgoal,
  registerTaskInput,
  draggingTask,
  onTaskDragStart,
  onTaskDrop,
  onTaskDragEnd,
  onTaskTitleChange,
  onTaskKeyDown,
  onToggleLoop,
  onDeleteTask,
  taskLimitReached,
  onAddTask,
}: TaskListProps) {
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
      <p className="text-sm font-semibold text-muted-foreground">Task List</p>

      <ul className="space-y-2">
        {subgoal.tasks.map((task, index) => {
          const isDragging = draggingTask?.taskId === task.id;
          return (
            <li
              key={task.id}
              draggable
              onDragStart={(event) => onTaskDragStart(event, subgoal.id, task.id)}
              onDragEnd={onTaskDragEnd}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onTaskDrop(event, subgoal.id, task.id)}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/80 px-3 py-2 text-sm transition",
                isDragging && "opacity-70 ring-2 ring-primary/40"
              )}
              aria-grabbed={isDragging}
            >
              <button
                type="button"
                className="text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                aria-label="タスクの並び替えハンドル"
              >
                <GripVertical className="size-4" />
              </button>
              <span className="text-xs font-semibold text-muted-foreground">{index + 1}.</span>
              <Input
                ref={registerTaskInput(task.id)}
                value={task.title}
                onChange={(event) => onTaskTitleChange(subgoal.id, task.id, event.target.value)}
                onKeyDown={(event) => onTaskKeyDown(event, subgoal.id, task.id)}
                placeholder="タスク内容を入力（Enterで次の行を追加）"
                className="flex-1 min-w-[200px]"
              />
              <Button
                type="button"
                variant={task.isLoop ? "secondary" : "ghost"}
                size="sm"
                className="text-xs font-semibold"
                aria-pressed={task.isLoop}
                onClick={() => onToggleLoop(subgoal.id, task.id)}
              >
                {task.isLoop ? "ループ" : "通常"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${task.title || "タスク"}を削除`}
                onClick={() => onDeleteTask(subgoal.id, task.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          );
        })}

        {subgoal.tasks.length === 0 && (
          <li className="rounded-xl border border-dashed border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            タスクを追加するとここに表示されます。
          </li>
        )}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddTask}
          disabled={taskLimitReached}
          className="sm:w-fit"
        >
          <Plus className="size-4" />
          タスクを追加
        </Button>
        <p className={cn("text-xs", taskLimitReached ? "text-destructive" : "text-muted-foreground")}>
          {taskLimitReached ? "タスクは 30 件が上限です。" : "Enter からの追加も可能です。"}
        </p>
      </div>
    </div>
  );
}
