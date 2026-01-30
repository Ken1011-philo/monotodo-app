import { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlanData } from "@/features/plan/hooks/usePlanData";
import { cn } from "@/lib/utils";
import type { LoopTaskTemplate, Task, UUID } from "@/types/domain";

const GOAL_TITLE_LIMIT = 255;
const MAX_SUBGOALS = 30;
const MAX_PLAN_ITEMS = 30; // normal tasks + active loop templates

export default function PlanPage() {
  const {
    plan,
    status,
    reload,
    saveGoalTitle,
    addSubgoal,
    updateSubgoalTitle,
    deleteSubgoal,
    moveSubgoal,
    addPlanItem,
    updatePlanItemTitle,
    deletePlanItem,
    movePlanItem,
    setLoopTemplateActive,
    setTaskCompleted,
  } = usePlanData();

  const [goalTitle, setGoalTitle] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    setGoalTitle(plan.goal?.title ?? "");
  }, [plan.goal?.title]);

  return (
    <section className="space-y-8 rounded-3xl border border-border/80 bg-card/70 p-8 shadow-sm">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Plan
        </p>
        <h1 className="text-3xl font-semibold">Goal / Subgoal 設計</h1>
      </header>

      <div className="space-y-8">
        <GoalInputSection
          goalTitle={goalTitle}
          setGoalTitle={setGoalTitle}
          lastSavedAt={lastSavedAt}
          setLastSavedAt={setLastSavedAt}
          onSave={saveGoalTitle}
          isSaving={status.savingGoal}
        />
        <SubgoalListSection
          subgoals={plan.subgoals}
          loading={status.loading}
          error={status.error}
          onReload={reload}
          onAddSubgoal={addSubgoal}
          onUpdateSubgoalTitle={updateSubgoalTitle}
          onDeleteSubgoal={deleteSubgoal}
          onMoveSubgoal={moveSubgoal}
          onAddPlanItem={addPlanItem}
          onUpdatePlanItemTitle={updatePlanItemTitle}
          onDeletePlanItem={deletePlanItem}
          onMovePlanItem={movePlanItem}
          onToggleTaskCompleted={setTaskCompleted}
          onToggleLoopTemplateActive={setLoopTemplateActive}
        />
      </div>
    </section>
  );
}

type GoalInputProps = {
  goalTitle: string;
  setGoalTitle: (value: string) => void;
  lastSavedAt: Date | null;
  setLastSavedAt: (value: Date | null) => void;
  onSave: (title: string) => Promise<unknown>;
  isSaving: boolean;
};

function GoalInputSection({
  goalTitle,
  setGoalTitle,
  lastSavedAt,
  setLastSavedAt,
  onSave,
  isSaving,
}: GoalInputProps) {
  const goalError =
    goalTitle.length > GOAL_TITLE_LIMIT
      ? `Goalタイトルは${GOAL_TITLE_LIMIT}文字以内に収めてください`
      : null;

  async function handleGoalSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (goalError) return;
    await onSave(goalTitle);
    setLastSavedAt(new Date());
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-background/60 p-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Goal Title
        </p>
        <h2 className="text-2xl font-semibold">
          達成したい 目標 をここに書きましょう
        </h2>
        <p className="text-sm text-muted-foreground">
          ゴールは空でも構いません。ただし、目標はあいまいで短くてもやりたい事として言語化しておくのがおすすめです。
        </p>
      </header>

      <form onSubmit={handleGoalSubmit} className="space-y-3">
        <Input
          value={goalTitle}
          onChange={(event) => setGoalTitle(event.target.value)}
          placeholder="例：絵が上手くなりたい（空欄でもOK）"
          aria-invalid={goalError ? "true" : "false"}
          autoComplete="off"
        />

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <p className="text-muted-foreground">
            1 行のみ入力可。重要キーワードの抜き出しを意識しましょう。
          </p>
          <span className="ml-auto font-mono text-muted-foreground">
            {goalTitle.length}/{GOAL_TITLE_LIMIT}
          </span>
        </div>

        {goalError ? (
          <p className="text-xs font-medium text-destructive">{goalError}</p>
        ) : lastSavedAt ? (
          <p className="text-xs text-emerald-600">
            {lastSavedAt.toLocaleTimeString()} に保存しました
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            空欄のままでも保存可能です。
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={Boolean(goalError) || isSaving}
            className="min-w-[140px]"
          >
            <Save className="size-4" />
            {isSaving ? "保存中…" : "Goal を保存"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setGoalTitle("")}
            disabled={!goalTitle}
          >
            クリア
          </Button>
        </div>
      </form>
    </section>
  );
}

type SubgoalListProps = {
  subgoals: {
    id: UUID;
    title: string;
    sortKey: number;
    completionMode: "auto" | "manual";
    manualCompleted: boolean;
    completed: boolean;
    revision: number;
    tasks: Task[];
    loopTaskTemplates: LoopTaskTemplate[];
    goalId: UUID;
  }[];
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
  onAddSubgoal: (title: string) => Promise<unknown>;
  onUpdateSubgoalTitle: (id: UUID, title: string) => Promise<unknown>;
  onDeleteSubgoal: (id: UUID) => Promise<void>;
  onMoveSubgoal: (id: UUID, targetIndex: number) => Promise<unknown>;
  onAddPlanItem: (
    subgoalId: UUID,
    title: string,
    isLoopTemplate: boolean,
  ) => Promise<Task | LoopTaskTemplate>;
  onUpdatePlanItemTitle: (
    subgoalId: UUID,
    itemId: UUID,
    title: string,
    isLoopTemplate: boolean,
  ) => Promise<Task | LoopTaskTemplate>;
  onDeletePlanItem: (
    subgoalId: UUID,
    itemId: UUID,
    isLoopTemplate: boolean,
  ) => Promise<void>;
  onMovePlanItem: (
    subgoalId: UUID,
    itemId: UUID,
    targetIndex: number,
    isLoopTemplate: boolean,
  ) => Promise<Task[] | LoopTaskTemplate[]>;
  onToggleTaskCompleted: (
    subgoalId: UUID,
    taskId: UUID,
    completed: boolean,
  ) => Promise<Task>;
  onToggleLoopTemplateActive: (
    subgoalId: UUID,
    loopTemplateId: UUID,
    isActive: boolean,
  ) => Promise<LoopTaskTemplate>;
};

function SubgoalListSection({
  subgoals,
  loading,
  error,
  onReload,
  onAddSubgoal,
  onUpdateSubgoalTitle,
  onDeleteSubgoal,
  onMoveSubgoal,
  onAddPlanItem,
  onUpdatePlanItemTitle,
  onDeletePlanItem,
  onMovePlanItem,
  onToggleTaskCompleted,
  onToggleLoopTemplateActive,
}: SubgoalListProps) {
  const [draftTitle, setDraftTitle] = useState("");
  const [draggingSubgoalId, setDraggingSubgoalId] = useState<UUID | null>(null);
  const [draggingItem, setDraggingItem] = useState<{
    subgoalId: UUID;
    itemId: UUID;
    isLoopTemplate: boolean;
  } | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<UUID | null>(null);
  const taskInputRefs = useRef<Map<string, HTMLInputElement | null>>(
    new Map<string, HTMLInputElement | null>(),
  );
  const [titleDrafts, setTitleDrafts] = useState<Map<string, string>>(
    new Map(),
  );
  const [subgoalDrafts, setSubgoalDrafts] = useState<Map<string, string>>(
    new Map(),
  );

  const limitReached = subgoals.length >= MAX_SUBGOALS;
  const trimmedDraft = draftTitle.trim();
  const canSubmitDraft = Boolean(trimmedDraft) && !limitReached;

  const helperText = useMemo(() => {
    if (limitReached) {
      return "Subgoal は 30 件が上限です。削除してから追加してください。";
    }
    return "Enter または追加ボタンで新しい Subgoal挿入できます。";
  }, [limitReached]);

  useEffect(() => {
    if (!pendingFocusId) return;
    const nextInput = taskInputRefs.current.get(pendingFocusId);
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
      setPendingFocusId(null);
    }
  }, [pendingFocusId, subgoals]);

  const registerTaskInput = (taskId: string) => {
    return (element: HTMLInputElement | null) => {
      const map = taskInputRefs.current;
      if (element) {
        map.set(taskId, element);
      } else {
        map.delete(taskId);
      }
    };
  };

  async function addSubgoalRow() {
    if (!canSubmitDraft) return;
    await onAddSubgoal(trimmedDraft);
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
    void addSubgoalRow();
  }

  async function handleUpdateSubgoalTitle(
    id: UUID,
    value: string,
    composing: boolean,
  ) {
    setSubgoalDrafts((prev) => {
      const next = new Map(prev);
      next.set(id, value);
      return next;
    });

    if (composing) return;

    await onUpdateSubgoalTitle(id, value);
    setSubgoalDrafts((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleDeleteSubgoal(id: UUID) {
    await onDeleteSubgoal(id);
  }

  async function addTaskRow(subgoalId: UUID, isLoopTemplate: boolean) {
    const subgoal = subgoals.find((s) => s.id === subgoalId);
    if (!subgoal) return;
    const activeCount =
      subgoal.tasks.length +
      subgoal.loopTaskTemplates.filter((lt) => lt.isActive).length;
    if (activeCount >= MAX_PLAN_ITEMS) return;

    const created = await onAddPlanItem(subgoalId, "", isLoopTemplate);
    setPendingFocusId(created.id);
  }

  function handleSubgoalTitleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    subgoal: { id: UUID },
  ) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    void addTaskRow(subgoal.id, false);
  }

  function handleItemTitleChange(
    subgoalId: UUID,
    itemId: UUID,
    value: string,
    isLoopTemplate: boolean,
    composing: boolean,
  ) {
    setTitleDrafts((prev) => {
      const next = new Map(prev);
      next.set(itemId, value);
      return next;
    });

    if (composing) return;

    void (async () => {
      await onUpdatePlanItemTitle(subgoalId, itemId, value, isLoopTemplate);
      setTitleDrafts((prev) => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });
    })();
  }

  function handleTaskKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    subgoalId: UUID,
    _taskId: UUID,
  ) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    void addTaskRow(subgoalId, false);
  }

  async function deleteItem(
    subgoalId: UUID,
    itemId: UUID,
    isLoopTemplate: boolean,
  ) {
    await onDeletePlanItem(subgoalId, itemId, isLoopTemplate);
  }

  function handleSubgoalDragStart(
    event: React.DragEvent<HTMLLIElement>,
    id: UUID,
  ) {
    setDraggingSubgoalId(id);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleSubgoalDrop(
    event: React.DragEvent<HTMLLIElement>,
    targetId: UUID,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (!draggingSubgoalId || draggingSubgoalId === targetId) {
      setDraggingSubgoalId(null);
      return;
    }

    const targetIndex = subgoals.findIndex((item) => item.id === targetId);
    if (targetIndex !== -1) {
      void onMoveSubgoal(draggingSubgoalId, targetIndex);
    }
    setDraggingSubgoalId(null);
  }

  function handleItemDragStart(
    event: React.DragEvent<HTMLLIElement>,
    subgoalId: UUID,
    itemId: UUID,
    isLoopTemplate: boolean,
  ) {
    setDraggingItem({ subgoalId, itemId, isLoopTemplate });
    event.dataTransfer.effectAllowed = "move";
  }

  function handleItemDrop(
    event: React.DragEvent<HTMLLIElement>,
    subgoalId: UUID,
    targetItemId: UUID,
    isLoopTemplate: boolean,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (!draggingItem || draggingItem.subgoalId !== subgoalId) {
      setDraggingItem(null);
      return;
    }
    if (draggingItem.itemId === targetItemId) {
      setDraggingItem(null);
      return;
    }

    const subgoal = subgoals.find((s) => s.id === subgoalId);
    if (!subgoal) return;
    const combinedList = [
      ...subgoal.tasks
        .filter((t) => !t.completed)
        .map((t) => ({ ...t, isLoopTemplate: false })),
      ...subgoal.loopTaskTemplates
        .filter((l) => l.isActive)
        .map((l) => ({ ...l, isLoopTemplate: true })),
    ].sort(
      (a, b) =>
        a.sortKey - b.sortKey ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
    const targetIndex = combinedList.findIndex(
      (item) => item.id === targetItemId,
    );
    if (targetIndex !== -1) {
      void onMovePlanItem(
        subgoalId,
        draggingItem.itemId,
        targetIndex,
        draggingItem.isLoopTemplate,
      );
    }
    setDraggingItem(null);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-background/60 p-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Subgoal List
        </p>
        <h2 className="text-2xl font-semibold">
          サブゴールとタスクをここに作成しましょう
          <br />
          一番上のサブゴールとタスクがDo ページに反映されます
        </h2>
      </header>

      <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-sm">
        {loading
          ? "読み込み中…"
          : error
            ? `エラー: ${error}`
            : "正常にデータが同期されました"}
        {error && (
          <Button variant="link" className="px-2" onClick={() => onReload()}>
            再読み込み
          </Button>
        )}
      </div>

      <ol className="space-y-4">
        {subgoals.map((subgoal, index) => {
          const isDragging = draggingSubgoalId === subgoal.id;
          const activePlanItems =
            subgoal.tasks.filter((t) => !t.completed).length +
            subgoal.loopTaskTemplates.filter((lt) => lt.isActive).length;
          const planLimitReached = activePlanItems >= MAX_PLAN_ITEMS;
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
                isDragging && "opacity-70 ring-2 ring-primary/40",
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
                    <span>{index + 1}. Subgoal</span>
                    <span>
                      Plan items {activePlanItems}/{MAX_PLAN_ITEMS}
                    </span>
                  </div>
                  <Input
                    value={subgoalDrafts.get(subgoal.id) ?? subgoal.title}
                    onChange={(event) => {
                      const nativeEvent = event.nativeEvent as CompositionEvent;
                      const composing =
                        "isComposing" in nativeEvent &&
                        (nativeEvent as any).isComposing;
                      void handleUpdateSubgoalTitle(
                        subgoal.id,
                        event.target.value,
                        composing,
                      );
                    }}
                    onBlur={(event) =>
                      void handleUpdateSubgoalTitle(
                        subgoal.id,
                        event.target.value,
                        false,
                      )
                    }
                    onKeyDown={(event) =>
                      handleSubgoalTitleKeyDown(event, subgoal)
                    }
                    placeholder="サブゴールタイトル（例：人物が描けるようになる）"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter
                    で新規タスク行が末尾に追加され、入力フォーカスが移動します。
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
                draggingItem={draggingItem}
                onItemDragStart={handleItemDragStart}
                onItemDrop={handleItemDrop}
                onItemDragEnd={() => setDraggingItem(null)}
                onItemTitleChange={handleItemTitleChange}
                onTaskKeyDown={handleTaskKeyDown}
                onDeleteItem={deleteItem}
                onToggleTaskCompleted={onToggleTaskCompleted}
                onToggleLoopTemplateActive={onToggleLoopTemplateActive}
                planLimitReached={planLimitReached}
                onAddTask={() => addTaskRow(subgoal.id, false)}
                onAddLoopTemplate={() => addTaskRow(subgoal.id, true)}
                titleDrafts={titleDrafts}
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
            placeholder={
              limitReached
                ? "上限に達しています"
                : "サブゴールを入力（例：『人を描けるようになる』など)"
            }
            disabled={limitReached}
            aria-disabled={limitReached}
          />
          <Button
            type="button"
            onClick={addSubgoalRow}
            disabled={!canSubmitDraft}
            className="sm:min-w-[160px]"
          >
            <Plus className="size-4" />
            Subgoal を追加
          </Button>
        </div>
        <p
          className={cn(
            "text-xs",
            limitReached ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {helperText}（{subgoals.length}/{MAX_SUBGOALS}）
        </p>
      </div>
    </section>
  );
}

type TaskListProps = {
  subgoal: {
    id: UUID;
    title: string;
    tasks: Task[];
    loopTaskTemplates: LoopTaskTemplate[];
    goalId: UUID;
  };
  registerTaskInput: (
    taskId: string,
  ) => (element: HTMLInputElement | null) => void;
  draggingItem: {
    subgoalId: UUID;
    itemId: UUID;
    isLoopTemplate: boolean;
  } | null;
  onItemDragStart: (
    event: React.DragEvent<HTMLLIElement>,
    subgoalId: UUID,
    itemId: UUID,
    isLoopTemplate: boolean,
  ) => void;
  onItemDrop: (
    event: React.DragEvent<HTMLLIElement>,
    subgoalId: UUID,
    itemId: UUID,
    isLoopTemplate: boolean,
  ) => void;
  onItemDragEnd: () => void;
  onItemTitleChange: (
    subgoalId: UUID,
    taskId: UUID,
    value: string,
    isLoopTemplate: boolean,
    composing: boolean,
  ) => void;
  onTaskKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
    subgoalId: UUID,
    taskId: UUID,
  ) => void;
  onDeleteItem: (
    subgoalId: UUID,
    taskId: UUID,
    isLoopTemplate: boolean,
  ) => void;
  onToggleTaskCompleted: (
    subgoalId: UUID,
    taskId: UUID,
    completed: boolean,
  ) => void;
  onToggleLoopTemplateActive: (
    subgoalId: UUID,
    loopTemplateId: UUID,
    isActive: boolean,
  ) => void;
  planLimitReached: boolean;
  onAddTask: () => void;
  onAddLoopTemplate: () => void;
  titleDrafts: Map<string, string>;
};

function TaskList({
  subgoal,
  registerTaskInput,
  draggingItem,
  onItemDragStart,
  onItemDrop,
  onItemDragEnd,
  onItemTitleChange,
  onTaskKeyDown,
  onDeleteItem,
  onToggleTaskCompleted,
  onToggleLoopTemplateActive,
  planLimitReached,
  onAddTask,
  onAddLoopTemplate,
  titleDrafts,
}: TaskListProps) {
  const incompleteItems = [
    ...subgoal.tasks
      .filter((t) => !t.completed)
      .map((t) => ({ ...t, isLoopTemplate: false })),
    ...subgoal.loopTaskTemplates
      .filter((l) => l.isActive)
      .map((l) => ({ ...l, isLoopTemplate: true })),
  ].sort(
    (a, b) =>
      a.sortKey - b.sortKey ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );

  const completedTasks = subgoal.tasks
    .filter((t) => t.completed)
    .sort((a, b) => {
      if (a.completedAt && b.completedAt)
        return b.completedAt.localeCompare(a.completedAt);
      if (a.completedAt) return -1;
      if (b.completedAt) return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  const inactiveLoopTemplates = subgoal.loopTaskTemplates
    .filter((l) => !l.isActive)
    .sort(
      (a, b) =>
        a.sortKey - b.sortKey ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
  const closedItems: Array<
    (Task | LoopTaskTemplate) & { isLoopTemplate: boolean }
  > = [
    ...completedTasks.map((t) => ({ ...t, isLoopTemplate: false })),
    ...inactiveLoopTemplates.map((l) => ({ ...l, isLoopTemplate: true })),
  ];

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
        <span>Plan Items</span>
        <span className="text-xs text-muted-foreground">
          通常タスクと定期タスクを一列で並べ替えできます。
        </span>
      </div>

      <ul className="space-y-2">
        {incompleteItems.map((item) => {
          const isDragging =
            draggingItem?.itemId === item.id &&
            draggingItem?.isLoopTemplate === item.isLoopTemplate;
          const isLoop = item.isLoopTemplate;
          return (
            <li
              key={item.id}
              draggable
              onDragStart={(event) =>
                onItemDragStart(event, subgoal.id, item.id, isLoop)
              }
              onDragEnd={onItemDragEnd}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onItemDrop(event, subgoal.id, item.id, isLoop)}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/80 px-3 py-2 text-sm transition",
                isDragging && "opacity-70 ring-2 ring-primary/40",
              )}
              aria-grabbed={isDragging}
            >
              <button
                type="button"
                className="text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                aria-label="アイテムの並び替えハンドル"
              >
                <GripVertical className="size-4" />
              </button>
              {!isLoop && (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked="false"
                  onClick={() =>
                    onToggleTaskCompleted(subgoal.id, item.id, true)
                  }
                  className="flex size-5 items-center justify-center rounded-full border border-muted-foreground/60 bg-background text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {/* unchecked */}
                </button>
              )}
              {isLoop && (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked="false"
                  onClick={() =>
                    onToggleLoopTemplateActive(subgoal.id, item.id, false)
                  }
                  className="flex size-5 items-center justify-center rounded-full border border-muted-foreground/60 bg-background text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {/* unchecked */}
                </button>
              )}
              <Input
                ref={registerTaskInput(item.id)}
                value={titleDrafts.get(item.id) ?? item.title}
                onChange={(event) => {
                  const nativeEvent = event.nativeEvent as CompositionEvent;
                  const composing =
                    "isComposing" in nativeEvent &&
                    (nativeEvent as any).isComposing;
                  onItemTitleChange(
                    subgoal.id,
                    item.id,
                    event.target.value,
                    isLoop,
                    composing,
                  );
                }}
                onBlur={(event) =>
                  onItemTitleChange(
                    subgoal.id,
                    item.id,
                    event.target.value,
                    isLoop,
                    false,
                  )
                }
                onKeyDown={(event) => onTaskKeyDown(event, subgoal.id, item.id)}
                placeholder={
                  isLoop
                    ? "定期タスク名（例：模写練習）"
                    : "タスクを入力（例：配色・色選びを学ぶ）"
                }
                className="flex-1 min-w-[200px]"
              />
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[11px] font-semibold",
                  isLoop
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-700",
                )}
              >
                {isLoop ? "定期" : "通常"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${item.title || (isLoop ? "定期タスク" : "タスク")}を削除`}
                onClick={() => onDeleteItem(subgoal.id, item.id, isLoop)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          );
        })}

        {incompleteItems.length === 0 && (
          <li className="rounded-xl border border-dashed border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            タスクを追加するとここに表示されます。
          </li>
        )}
      </ul>

      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          完了済
        </p>
        <ul className="space-y-2">
          {closedItems.map((item) => {
            const isLoop = item.isLoopTemplate;
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isLoop ? "true" : "true"}
                  onClick={() =>
                    isLoop
                      ? onToggleLoopTemplateActive(subgoal.id, item.id, true)
                      : onToggleTaskCompleted(subgoal.id, item.id, false)
                  }
                  className="flex size-5 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground"
                >
                  ✓
                </button>
                <Input
                  value={item.title}
                  disabled
                  className="flex-1 min-w-[200px] bg-muted text-muted-foreground"
                />
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isLoop ? "停止中" : "完了"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${item.title || (isLoop ? "定期タスク" : "タスク")}を削除`}
                  onClick={() => onDeleteItem(subgoal.id, item.id, isLoop)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
          {closedItems.length === 0 && (
            <li className="rounded-xl border border-dashed border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              完了済み・停止中のアイテムはありません。
            </li>
          )}
        </ul>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddTask}
          disabled={planLimitReached}
          className="sm:w-fit"
        >
          <Plus className="size-4" />
          タスクを追加
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddLoopTemplate}
          disabled={planLimitReached}
          className="sm:w-fit"
        >
          <Plus className="size-4" />
          定期テンプレを追加
        </Button>
        <p
          className={cn(
            "text-xs",
            planLimitReached ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {planLimitReached
            ? "Plan items は 30 件が上限です（通常タスク + 有効な定期テンプレ）。"
            : "Enter からの追加も可能です。"}
        </p>
      </div>
    </div>
  );
}
