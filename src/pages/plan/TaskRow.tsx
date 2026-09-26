import type { KeyboardEvent, Ref } from "react";
import { Repeat, Trash2 } from "lucide-react";

import {
  DragHandle,
  type SortableHandleProps,
} from "@/components/common/SortableList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DraftTask } from "@/features/plan/model/planDraft";
import { cn } from "@/lib/utils";

type TaskRowProps = {
  task: DraftTask;
  index: number;
  handleProps: SortableHandleProps;
  isDragging: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onRename: (title: string) => void;
  /** Enter（IME 確定を除く）で呼ばれる */
  onEnter: () => void;
  onToggleLoop: () => void;
  onDelete: () => void;
};

/** タスク 1 行の表示。状態は持たず、操作はすべて props で受け取る */
export function TaskRow({
  task,
  index,
  handleProps,
  isDragging,
  inputRef,
  onRename,
  onEnter,
  onToggleLoop,
  onDelete,
}: TaskRowProps) {
  const label = task.title || `タスク${index + 1}`;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    onEnter();
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-1 py-1.5 sm:gap-2",
        isDragging && "bg-accent shadow-lg ring-1 ring-primary/40"
      )}
    >
      <DragHandle handleProps={handleProps} label={`${label}を並べ替え`} />
      {/* スマホでは入力欄の幅を優先して番号を省く（aria-label に番号を含む） */}
      <span className="hidden w-5 shrink-0 text-right text-xs font-semibold text-muted-foreground sm:inline">
        {index + 1}.
      </span>
      <Input
        ref={inputRef}
        value={task.title}
        onChange={(event) => onRename(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="タスクを入力"
        aria-label={`タスク${index + 1}`}
        className="min-w-0 flex-1"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={task.isLoop}
        aria-label={`${label}：${task.isLoop ? "定期" : "一回"}（切り替え）`}
        onClick={onToggleLoop}
        className={cn(
          "w-16 shrink-0 px-2 text-xs",
          task.isLoop &&
            "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:border-primary/40 dark:bg-primary/10"
        )}
      >
        {task.isLoop && <Repeat className="size-3.5" />}
        {task.isLoop ? "定期" : "一回"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`${label}を削除`}
        onClick={onDelete}
        className="shrink-0 text-muted-foreground"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
