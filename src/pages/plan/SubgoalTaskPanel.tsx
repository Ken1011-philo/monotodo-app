import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { ChevronDown, Plus } from "lucide-react";

import { Eyebrow } from "@/components/common/SectionHeader";
import {
  SortableList,
  type SortableHandleProps,
} from "@/components/common/SortableList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_TASKS_PER_SUBGOAL,
  type DraftSubgoal,
  type DraftTask,
} from "@/features/plan/model/planDraft";
import { cn } from "@/lib/utils";
import { TaskRow } from "./TaskRow";

type SubgoalTaskPanelProps = {
  subgoal: DraftSubgoal;
  /** 0 始まりの並び順 */
  index: number;
  total: number;
  onRename: (title: string) => void;
  /** 追加できた場合は新しいタスクの ID を返す */
  onAddTask: () => string | null;
  onRenameTask: (taskId: string, title: string) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onToggleTaskLoop: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (activeId: string, overId: string) => void;
};

/**
 * 選択中のサブゴールの見出しとタスク一覧。
 * Google ToDo リストにならい、完了したタスクは下の「完了済み」にまとめて畳む。
 */
export function SubgoalTaskPanel({
  subgoal,
  index,
  total,
  onRename,
  onAddTask,
  onRenameTask,
  onToggleTaskComplete,
  onToggleTaskLoop,
  onDeleteTask,
  onMoveTask,
}: SubgoalTaskPanelProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const { registerInput, focusWhenRendered } = usePendingFocus(
    subgoal.tasks,
    addButtonRef
  );
  const [showCompleted, setShowCompleted] = useState(false);
  const completedListId = useId();

  const activeTasks = subgoal.tasks.filter((t) => !t.completed);
  const completedTasks = subgoal.tasks.filter((t) => t.completed);
  const limitReached = subgoal.tasks.length >= MAX_TASKS_PER_SUBGOAL;

  const addTaskAndFocus = () => {
    const createdId = onAddTask();
    if (createdId) focusWhenRendered(createdId, { select: true });
  };

  /** 行が一覧から消える操作（完了切り替え・削除）の後、同じ一覧の隣の行へフォーカスを移す */
  const leaveRow = (list: DraftTask[], taskId: string, action: () => void) => {
    const i = list.findIndex((t) => t.id === taskId);
    const neighbor = list[i + 1] ?? list[i - 1];
    // 隣がなければ「タスクを追加」ボタンへ
    focusWhenRendered(neighbor?.id ?? null);
    action();
  };

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    addTaskAndFocus();
  }

  const renderRow = (
    task: DraftTask,
    i: number,
    list: DraftTask[],
    sortable?: { handleProps: SortableHandleProps; isDragging: boolean },
  ) => (
    <TaskRow
      task={task}
      index={i}
      inputLabel={
        task.completed ? `完了済みのタスク${i + 1}` : `タスク${i + 1}`
      }
      handleProps={sortable?.handleProps}
      isDragging={sortable?.isDragging}
      inputRef={registerInput(task.id)}
      onRename={(title) => onRenameTask(task.id, title)}
      onEnter={addTaskAndFocus}
      onToggleComplete={() =>
        leaveRow(list, task.id, () => onToggleTaskComplete(task.id))
      }
      onToggleLoop={() => onToggleTaskLoop(task.id)}
      onDelete={() => leaveRow(list, task.id, () => onDeleteTask(task.id))}
    />
  );

  return (
    <section className="space-y-4" aria-label="サブゴールのタスク">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Eyebrow>
            Subgoal {index + 1} / {total}
          </Eyebrow>
          <span className="font-mono text-xs text-muted-foreground">
            Tasks {subgoal.tasks.length}/{MAX_TASKS_PER_SUBGOAL}
          </span>
        </div>
        <Input
          value={subgoal.title}
          onChange={(event) => onRename(event.target.value)}
          onKeyDown={handleTitleKeyDown}
          placeholder="サブゴール名を入力"
          aria-label={`サブゴール${index + 1}のタイトル`}
          className="h-11 text-lg font-semibold"
        />
      </div>

      {activeTasks.length > 0 ? (
        <SortableList
          as="ol"
          items={activeTasks}
          onMove={onMoveTask}
          getItemLabel={(task, i) => task.title || `タスク${i + 1}`}
          renderItem={(task, i, sortable) =>
            renderRow(task, i, activeTasks, sortable)
          }
        />
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {completedTasks.length > 0
            ? "すべてのタスクが完了しました。"
            : "このサブゴールにはまだタスクがありません。"}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          ref={addButtonRef}
          type="button"
          variant="ghost"
          size="sm"
          onClick={addTaskAndFocus}
          disabled={limitReached}
          className="text-primary hover:text-primary"
        >
          <Plus />
          タスクを追加
        </Button>
        {limitReached && (
          <p className="text-xs text-destructive">
            タスクは {MAX_TASKS_PER_SUBGOAL} 件が上限です。
          </p>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={showCompleted}
            aria-controls={completedListId}
            onClick={() => setShowCompleted((open) => !open)}
            className="text-muted-foreground"
          >
            <ChevronDown
              className={cn(
                "transition-transform",
                !showCompleted && "-rotate-90",
              )}
            />
            完了済み（{completedTasks.length}）
          </Button>
          {showCompleted && (
            <ul id={completedListId} className="mt-1">
              {completedTasks.map((task, i) => (
                <li key={task.id}>{renderRow(task, i, completedTasks)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * 行が描画された後に、その入力欄へフォーカスを移す（追加直後は全選択）。
 * id に null を渡すと fallbackRef の要素へ移す
 */
function usePendingFocus(
  renderedItems: unknown,
  fallbackRef: RefObject<HTMLElement | null>
) {
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const pending = useRef<{ id: string | null; select: boolean } | null>(null);

  useEffect(() => {
    const target = pending.current;
    if (!target) return;
    if (target.id === null) {
      fallbackRef.current?.focus();
      pending.current = null;
      return;
    }
    const input = inputs.current.get(target.id);
    if (input) {
      input.focus();
      if (target.select) input.select();
      pending.current = null;
    }
  }, [renderedItems, fallbackRef]);

  const registerInput = useCallback(
    (id: string) => (element: HTMLInputElement | null) => {
      if (element) inputs.current.set(id, element);
      else inputs.current.delete(id);
    },
    [],
  );

  const focusWhenRendered = useCallback(
    (id: string | null, options?: { select?: boolean }) => {
      pending.current = { id, select: options?.select ?? false };
    },
    [],
  );

  return { registerInput, focusWhenRendered };
}
