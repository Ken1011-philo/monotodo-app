import type { KeyboardEvent, Ref } from "react";
import { Repeat, Trash2 } from "lucide-react";

import { RowMenu } from "@/components/common/RowMenu";
import {
  DragHandle,
  type SortableHandleProps,
} from "@/components/common/SortableList";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { DraftTask } from "@/features/plan/model/planDraft";
import { revealOnHover } from "@/lib/revealOnHover";
import { cn } from "@/lib/utils";

type TaskRowProps = {
  task: DraftTask;
  index: number;
  /** 入力欄の読み上げ名（例：「タスク1」） */
  inputLabel: string;
  /** 今日の時点で完了しているか（判定は呼び出し側） */
  done: boolean;
  /** 並べ替えできない行（完了済み）では渡さない */
  handleProps?: SortableHandleProps;
  isDragging?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onRename: (title: string) => void;
  /** Enter（IME 確定を除く）で呼ばれる */
  onEnter: () => void;
  onToggleComplete: () => void;
  onToggleLoop: () => void;
  onDelete: () => void;
};

/**
 * タスク 1 行の表示。状態は持たず、操作はすべて props で受け取る。
 * Google ToDo リストにならい、常に見せるのはチェックと名前だけにし、
 * 並べ替えハンドルと「︙」メニューはポインタを乗せたとき / フォーカス時に出す。
 */
export function TaskRow({
  task,
  index,
  inputLabel,
  done,
  handleProps,
  isDragging = false,
  inputRef,
  onRename,
  onEnter,
  onToggleComplete,
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
        "group/row flex items-center gap-1 rounded-lg py-1",
        isDragging && "bg-accent shadow-lg ring-1 ring-primary/40"
      )}
    >
      {handleProps ? (
        <DragHandle
          handleProps={handleProps}
          label={`${label}を並べ替え`}
          className={cn(revealOnHover, isDragging && "md:opacity-100")}
        />
      ) : (
        // 並べ替えできない行も、チェックの位置をそろえるために同じ幅を空ける
        <span aria-hidden className="size-9 shrink-0" />
      )}

      <Checkbox
        checked={done}
        onCheckedChange={onToggleComplete}
        aria-label={`${label}を完了にする`}
        className="mx-1.5 size-5 rounded-full border-muted-foreground/70"
      />

      <Input
        ref={inputRef}
        value={task.title}
        onChange={(event) => onRename(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="タスクを入力"
        aria-label={inputLabel}
        className={cn(
          // 普段は枠を出さず、ポインタを乗せたとき・編集中だけ入力欄として見せる
          "min-w-0 flex-1 border-transparent bg-transparent px-2 shadow-none hover:border-input dark:bg-transparent",
          done && "text-muted-foreground line-through"
        )}
      />

      {task.isLoop && (
        <span
          className="flex shrink-0 items-center px-1 text-primary"
          title="定期タスク"
        >
          <Repeat className="size-4" aria-hidden />
          <span className="sr-only">定期タスク</span>
        </span>
      )}

      <RowMenu
        label={`${label}のメニュー`}
        className={revealOnHover}
        items={[
          { label: "定期タスク", checked: task.isLoop, onSelect: onToggleLoop },
          {
            label: "削除",
            icon: Trash2,
            destructive: true,
            onSelect: onDelete,
          },
        ]}
      />
    </div>
  );
}
