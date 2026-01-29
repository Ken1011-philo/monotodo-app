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
    convertLoopTemplateToTask,
    setLoopTemplateActive,
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
        <p className="text-sm text-muted-foreground">
          Supabase と同期しながら Plan ページの入力体験を整備しています。ここで確定した情報が Do / Focus へ流れます。
        </p>
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
          onConvertLoopTemplateToTask={convertLoopTemplateToTask}
          onSetLoopTemplateActive={setLoopTemplateActive}
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
        <h2 className="text-2xl font-semibold">達成したい 目標 をここに書きましょう</h2>
        <p className="text-sm text-muted-foreground">
          ゴールは空でも構いません。ただし、目標はあいまいで短くてもやりたい事として言語化しておくのがおすすめです。
        </p>
      </header>

      <form onSubmit={handleGoalSubmit} className="space-y-3">
        <Input
          value={goalTitle}
          onChange={(event) => setGoalTitle(event.target.value)}
          placeholder="例：ギターが上手くなりたい（空欄でもOK）"
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
          <p className="text-xs text-muted-foreground">空欄のままでも保存可能です。</p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={Boolean(goalError) || isSaving} className="min-w-[140px]">
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
  onAddPlanItem: (subgoalId: UUID, title: string, isLoopTemplate: boolean) => Promise<Task | LoopTaskTemplate>;
  onUpdatePlanItemTitle: (
    subgoalId: UUID,
    itemId: UUID,
    title: string,
    isLoopTemplate: boolean
  ) => Promise<Task | LoopTaskTemplate>;
  onDeletePlanItem: (subgoalId: UUID, itemId: UUID, isLoopTemplate: boolean) => Promise<void>;
  onMovePlanItem: (
    subgoalId: UUID,
    itemId: UUID,
    targetIndex: number,
    isLoopTemplate: boolean
  ) => Promise<Task[] | LoopTaskTemplate[]>;
  onConvertLoopTemplateToTask: (subgoalId: UUID, loopTemplateId: UUID) => Promise<Task>;
  onSetLoopTemplateActive: (subgoalId: UUID, loopTemplateId: UUID, isActive: boolean) => Promise<LoopTaskTemplate>;
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
  onConvertLoopTemplateToTask,
  onSetLoopTemplateActive,
}: SubgoalListProps) {
  const [draftTitle, setDraftTitle] = useState("");
  const [draggingSubgoalId, setDraggingSubgoalId] = useState<UUID | null>(null);
  const [draggingItem, setDraggingItem] = useState<{
    subgoalId: UUID;
    itemId: UUID;
    isLoopTemplate: boolean;
  } | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<UUID | null>(null);
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

  async function handleUpdateSubgoalTitle(id: UUID, value: string) {
    await onUpdateSubgoalTitle(id, value);
  }

  async function handleDeleteSubgoal(id: UUID) {
    await onDeleteSubgoal(id);
  }

  async function addTaskRow(subgoalId: UUID, isLoopTemplate: boolean) {
    const subgoal = subgoals.find((s) => s.id === subgoalId);
    if (!subgoal) return;
    const activeCount = subgoal.tasks.length + subgoal.loopTaskTemplates.filter((lt) => lt.isActive).length;
    if (activeCount >= MAX_PLAN_ITEMS) return;

    const created = await onAddPlanItem(subgoalId, "", isLoopTemplate);
    setPendingFocusId(created.id);
  }

  function handleSubgoalTitleKeyDown(event: React.KeyboardEvent<HTMLInputElement>, subgoal: { id: UUID }) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    void addTaskRow(subgoal.id, false);
  }

  async function handleItemTitleChange(
    subgoalId: UUID,
    itemId: UUID,
    value: string,
    isLoopTemplate: boolean
  ) {
    await onUpdatePlanItemTitle(subgoalId, itemId, value, isLoopTemplate);
  }

  function handleTaskKeyDown(event: React.KeyboardEvent<HTMLInputElement>, subgoalId: UUID, _taskId: UUID) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    void addTaskRow(subgoalId, false);
  }

  async function deleteItem(subgoalId: UUID, itemId: UUID, isLoopTemplate: boolean) {
    await onDeletePlanItem(subgoalId, itemId, isLoopTemplate);
  }

  function handleSubgoalDragStart(event: React.DragEvent<HTMLLIElement>, id: UUID) {
    setDraggingSubgoalId(id);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleSubgoalDrop(event: React.DragEvent<HTMLLIElement>, targetId: UUID) {
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
    isLoopTemplate: boolean
  ) {
    setDraggingItem({ subgoalId, itemId, isLoopTemplate });
    event.dataTransfer.effectAllowed = "move";
  }

  function handleItemDrop(
    event: React.DragEvent<HTMLLIElement>,
    subgoalId: UUID,
    targetItemId: UUID,
    isLoopTemplate: boolean
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (
      !draggingItem ||
      draggingItem.subgoalId !== subgoalId ||
      draggingItem.isLoopTemplate !== isLoopTemplate
    ) {
      setDraggingItem(null);
      return;
    }
    if (draggingItem.itemId === targetItemId) {
      setDraggingItem(null);
      return;
    }

    const subgoal = subgoals.find((s) => s.id === subgoalId);
    if (!subgoal) return;
    const list = isLoopTemplate ? subgoal.loopTaskTemplates : subgoal.tasks;
    const targetIndex = list.findIndex((item) => item.id === targetItemId);
    if (targetIndex !== -1) {
      void onMovePlanItem(subgoalId, draggingItem.itemId, targetIndex, isLoopTemplate);
    }
    setDraggingItem(null);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-background/60 p-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Subgoal List</p>
        <h2 className="text-2xl font-semibold">
          サブゴールとタスクをここに作成しましょう
          <br />
          一番上のサブゴールとタスクがDo ページに反映されます
        </h2>
        <p className="text-sm text-muted-foreground">
          並べ替えはドラッグ＆ドロップ、Enter 操作で新規タスク行を追加します。サーバー側でも order を正規化する前提で、UI 制約も
          30 件上限に合わせています。
        </p>
      </header>

      <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-sm">
        {loading ? "読み込み中…" : error ? `エラー: ${error}` : "同期済みのデータを表示しています。"}
        {error && (
          <Button variant="link" className="px-2" onClick={() => onReload()}>
            再読み込み
          </Button>
        )}
      </div>

      <ol className="space-y-4">
        {subgoals.map((subgoal, index) => {
          const isDragging = draggingSubgoalId === subgoal.id;
          const activePlanItems = subgoal.tasks.length + subgoal.loopTaskTemplates.filter((lt) => lt.isActive).length;
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
                    <span>{index + 1}. Subgoal</span>
                    <span>Plan items {activePlanItems}/{MAX_PLAN_ITEMS}</span>
                  </div>
                  <Input
                    value={subgoal.title}
                    onChange={(event) => handleUpdateSubgoalTitle(subgoal.id, event.target.value)}
                    onKeyDown={(event) => handleSubgoalTitleKeyDown(event, subgoal)}
                    placeholder="サブゴールタイトル（例：マリーゴールドを弾けるようになる）"
                  />
                  <p className="text-xs text-muted-foreground">Enter で新規タスク行が末尾に追加され、入力フォーカスが移動します。</p>
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
                onConvertLoopTemplateToTask={(loopTemplateId) =>
                  onConvertLoopTemplateToTask(subgoal.id, loopTemplateId)
                }
                onSetLoopTemplateActive={onSetLoopTemplateActive}
                planLimitReached={planLimitReached}
                onAddTask={() => addTaskRow(subgoal.id, false)}
                onAddLoopTemplate={() => addTaskRow(subgoal.id, true)}
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
                : "サブゴールを入力（例：『ドライフラワーを弾けるようになる』など)"
            }
            disabled={limitReached}
            aria-disabled={limitReached}
          />
          <Button type="button" onClick={addSubgoalRow} disabled={!canSubmitDraft} className="sm:min-w-[160px]">
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
  subgoal: {
    id: UUID;
    title: string;
    tasks: Task[];
    loopTaskTemplates: LoopTaskTemplate[];
    goalId: UUID;
  };
  registerTaskInput: (taskId: string) => (element: HTMLInputElement | null) => void;
  draggingItem: { subgoalId: UUID; itemId: UUID; isLoopTemplate: boolean } | null;
  onItemDragStart: (
    event: React.DragEvent<HTMLLIElement>,
    subgoalId: UUID,
    itemId: UUID,
    isLoopTemplate: boolean
  ) => void;
  onItemDrop: (
    event: React.DragEvent<HTMLLIElement>,
    subgoalId: UUID,
    itemId: UUID,
    isLoopTemplate: boolean
  ) => void;
  onItemDragEnd: () => void;
  onItemTitleChange: (subgoalId: UUID, taskId: UUID, value: string, isLoopTemplate: boolean) => void;
  onTaskKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, subgoalId: UUID, taskId: UUID) => void;
  onDeleteItem: (subgoalId: UUID, taskId: UUID, isLoopTemplate: boolean) => void;
  onConvertLoopTemplateToTask: (loopTemplateId: UUID) => Promise<Task>;
  onSetLoopTemplateActive: (subgoalId: UUID, loopTemplateId: UUID, isActive: boolean) => Promise<LoopTaskTemplate>;
  planLimitReached: boolean;
  onAddTask: () => void;
  onAddLoopTemplate: () => void;
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
  onConvertLoopTemplateToTask,
  onSetLoopTemplateActive,
  planLimitReached,
  onAddTask,
  onAddLoopTemplate,
}: TaskListProps) {
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
        <span>Task List</span>
        <span className="text-xs text-muted-foreground">通常タスクと定期テンプレはいずれも上限合算30件です。</span>
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">通常タスク</h3>
      <ul className="space-y-2">
        {subgoal.tasks.map((task, index) => {
          const isDragging = draggingItem?.itemId === task.id && draggingItem?.isLoopTemplate === false;
          return (
            <li
              key={task.id}
              draggable
              onDragStart={(event) => onItemDragStart(event, subgoal.id, task.id, false)}
              onDragEnd={onItemDragEnd}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onItemDrop(event, subgoal.id, task.id, false)}
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
                onChange={(event) => onItemTitleChange(subgoal.id, task.id, event.target.value, false)}
                onKeyDown={(event) => onTaskKeyDown(event, subgoal.id, task.id)}
                placeholder="タスクを入力（例：Aマイナーを弾けるようになる）"
                className="flex-1 min-w-[200px]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${task.title || "タスク"}を削除`}
                onClick={() => onDeleteItem(subgoal.id, task.id, false)}
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

      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">定期テンプレ</h3>
      <ul className="space-y-2">
        {subgoal.loopTaskTemplates.map((loop, index) => {
          const isDragging = draggingItem?.itemId === loop.id && draggingItem?.isLoopTemplate === true;
          return (
            <li
              key={loop.id}
              draggable
              onDragStart={(event) => onItemDragStart(event, subgoal.id, loop.id, true)}
              onDragEnd={onItemDragEnd}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onItemDrop(event, subgoal.id, loop.id, true)}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/80 px-3 py-2 text-sm transition",
                isDragging && "opacity-70 ring-2 ring-primary/40"
              )}
              aria-grabbed={isDragging}
            >
              <button
                type="button"
                className="text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                aria-label="定期テンプレの並び替えハンドル"
              >
                <GripVertical className="size-4" />
              </button>
              <span className="text-xs font-semibold text-muted-foreground">{index + 1}.</span>
              <Input
                ref={registerTaskInput(loop.id)}
                value={loop.title}
                onChange={(event) => onItemTitleChange(subgoal.id, loop.id, event.target.value, true)}
                onKeyDown={(event) => onTaskKeyDown(event, subgoal.id, loop.id)}
                placeholder="定期タスク名（例：毎日コードを30分書く）"
                className="flex-1 min-w-[200px]"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-semibold"
                aria-pressed={!loop.isActive}
                onClick={() => onSetLoopTemplateActive(subgoal.id, loop.id, !loop.isActive)}
              >
                {loop.isActive ? "停止" : "再開"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="定期テンプレを通常タスクに変換"
                onClick={() => onConvertLoopTemplateToTask(loop.id)}
              >
                変換
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${loop.title || "定期テンプレ"}を削除`}
                onClick={() => onDeleteItem(subgoal.id, loop.id, true)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          );
        })}

        {subgoal.loopTaskTemplates.length === 0 && (
          <li className="rounded-xl border border-dashed border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            定期テンプレを追加するとここに表示されます。
          </li>
        )}
      </ul>

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
        <p className={cn("text-xs", planLimitReached ? "text-destructive" : "text-muted-foreground")}>
          {planLimitReached
            ? "Plan items は 30 件が上限です（通常タスク + 有効な定期テンプレ）。"
            : "Enter からの追加も可能です。"}
        </p>
      </div>
    </div>
  );
}
