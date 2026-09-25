import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import { Plus } from "lucide-react";

import { Eyebrow } from "@/components/common/SectionHeader";
import { SortableList } from "@/components/common/SortableList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_TASKS_PER_SUBGOAL,
  type DraftSubgoal,
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
  onToggleTaskLoop: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (activeId: string, overId: string) => void;
};

/** 選択中のサブゴールの見出しとタスク一覧 */
export function SubgoalTaskPanel({
  subgoal,
  index,
  total,
  onRename,
  onAddTask,
  onRenameTask,
  onToggleTaskLoop,
  onDeleteTask,
  onMoveTask,
}: SubgoalTaskPanelProps) {
  const { registerInput, focusWhenRendered } = usePendingFocus(subgoal.tasks);
  const limitReached = subgoal.tasks.length >= MAX_TASKS_PER_SUBGOAL;

  const addTaskAndFocus = () => {
    const createdId = onAddTask();
    if (createdId) focusWhenRendered(createdId);
  };

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    addTaskAndFocus();
  }

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
          placeholder="サブゴールタイトル（例：マリーゴールドを弾けるようになる）"
          aria-label={`サブゴール${index + 1}のタイトル`}
          className="h-11 text-lg font-semibold md:text-lg"
        />
        <p className="text-xs text-muted-foreground">
          Enter で新しいタスク行を追加します。
        </p>
      </div>

      {subgoal.tasks.length > 0 ? (
        <SortableList
          as="ol"
          items={subgoal.tasks}
          onMove={onMoveTask}
          getItemLabel={(task, i) => task.title || `タスク${i + 1}`}
          className="divide-y divide-border"
          renderItem={(task, i, { handleProps, isDragging }) => (
            <TaskRow
              task={task}
              index={i}
              handleProps={handleProps}
              isDragging={isDragging}
              inputRef={registerInput(task.id)}
              onRename={(title) => onRenameTask(task.id, title)}
              onEnter={addTaskAndFocus}
              onToggleLoop={() => onToggleTaskLoop(task.id)}
              onDelete={() => onDeleteTask(task.id)}
            />
          )}
        />
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          このサブゴールにはまだタスクがありません。
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTaskAndFocus}
          disabled={limitReached}
        >
          <Plus />
          タスクを追加
        </Button>
        <p
          className={cn(
            "text-xs",
            limitReached ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {limitReached
            ? `タスクは ${MAX_TASKS_PER_SUBGOAL} 件が上限です。`
            : "Enter からの追加も可能です。"}
        </p>
      </div>
    </section>
  );
}

/** 追加した行が描画された後に、その入力欄へフォーカスを移す */
function usePendingFocus(renderedItems: unknown) {
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const pendingId = useRef<string | null>(null);

  useEffect(() => {
    const id = pendingId.current;
    if (!id) return;
    const input = inputs.current.get(id);
    if (input) {
      input.focus();
      input.select();
      pendingId.current = null;
    }
  }, [renderedItems]);

  const registerInput = useCallback(
    (id: string) => (element: HTMLInputElement | null) => {
      if (element) inputs.current.set(id, element);
      else inputs.current.delete(id);
    },
    []
  );

  const focusWhenRendered = useCallback((id: string) => {
    pendingId.current = id;
  }, []);

  return { registerInput, focusWhenRendered };
}
