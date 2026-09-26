import { useRef, useState, type ReactNode } from "react";
import { Check, Repeat, Trash2 } from "lucide-react";

import { RowMenu } from "@/components/common/RowMenu";
import { DragHandle, SortableList } from "@/components/common/SortableList";
import { Button } from "@/components/ui/button";
import type {
  DraftSubgoal,
  subgoalProgress,
} from "@/features/plan/model/planDraft";
import { revealOnHover } from "@/lib/revealOnHover";
import { cn } from "@/lib/utils";
import { DeleteSubgoalDialog } from "./DeleteSubgoalDialog";
import { SubgoalAddForm } from "./SubgoalAddForm";
import { subgoalLabel } from "./planLabels";

type PlanSidebarProps = {
  goalTitle: string;
  subgoals: DraftSubgoal[];
  selectedSubgoalId: string | null;
  canAddSubgoal: boolean;
  /** 今日の時点の進み具合（判定は呼び出し側） */
  progressOf: (subgoal: DraftSubgoal) => ReturnType<typeof subgoalProgress>;
  onSelect: (subgoalId: string) => void;
  onMove: (activeId: string, overId: string) => void;
  onDelete: (subgoalId: string) => void;
  onAdd: (title: string) => string | null;
  onGoalClick: () => void;
};

/**
 * Start → サブゴール… → Goal のロードマップ。
 * PC のサイドとスマホの Sheet の両方で使うため、表示と操作の受け渡しだけを担う。
 */
export function PlanSidebar({
  goalTitle,
  subgoals,
  selectedSubgoalId,
  canAddSubgoal,
  progressOf,
  onSelect,
  onMove,
  onDelete,
  onAdd,
  onGoalClick,
}: PlanSidebarProps) {
  const [pendingDelete, setPendingDelete] = useState<DraftSubgoal | null>(null);
  const navRef = useRef<HTMLElement>(null);
  // 削除確認を開いた 🗑 ボタン。キャンセル時はここへ、削除時は選択中の項目へフォーカスを戻す
  const deleteTriggerRef = useRef<HTMLElement | null>(null);
  const pendingIndex = pendingDelete
    ? subgoals.findIndex((s) => s.id === pendingDelete.id)
    : -1;

  return (
    <nav
      ref={navRef}
      aria-label="サブゴールのロードマップ"
      // --handle-col: ハンドル列の幅。行の列定義と縦線の位置で共有する
      className="relative [--handle-col:2.5rem]"
    >
      {/* ノードをつなぐ縦線（ハンドル列 + ノード中心 0.625rem の位置） */}
      <div
        aria-hidden
        className="absolute top-4 bottom-5 left-[calc(var(--handle-col)+0.625rem-1px)] w-0.5 rounded-full bg-border"
      />

      <RoadmapRow node={<StartNode />}>
        <span className="px-2 text-sm text-muted-foreground">Start</span>
      </RoadmapRow>

      <SortableList
        as="ol"
        items={subgoals}
        onMove={onMove}
        getItemLabel={subgoalLabel}
        renderItem={(subgoal, index, { handleProps, isDragging }) => {
          const label = subgoalLabel(subgoal, index);
          const selected = subgoal.id === selectedSubgoalId;
          const hasLoop = subgoal.tasks.some((t) => t.isLoop);
          const progress = progressOf(subgoal);
          return (
            <RoadmapRow
              className={cn(
                "group/row rounded-lg",
                isDragging && "bg-accent shadow-lg ring-1 ring-primary/40"
              )}
              handle={
                <DragHandle
                  handleProps={handleProps}
                  label={`${label}を並べ替え`}
                  className={cn(revealOnHover, isDragging && "md:opacity-100")}
                />
              }
              node={
                <SubgoalNode
                  selected={selected}
                  completed={progress.isComplete}
                />
              }
              trailing={
                <RowMenu
                  label={`${label}のメニュー`}
                  className={revealOnHover}
                  items={[
                    {
                      label: "削除",
                      icon: Trash2,
                      destructive: true,
                      onSelect: (trigger) => {
                        deleteTriggerRef.current = trigger;
                        setPendingDelete(subgoal);
                      },
                    },
                  ]}
                />
              }
            >
              <Button
                type="button"
                variant="ghost"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(subgoal.id)}
                title={label}
                className={cn(
                  "h-auto w-full min-w-0 justify-start px-2 py-1.5 text-left font-normal",
                  selected &&
                    "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "truncate text-base",
                      selected && "font-semibold",
                      !subgoal.title.trim() && "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {progress.total > 0
                      ? `${progress.done}/${progress.total}件`
                      : "0件"}
                    {progress.isComplete && (
                      <span className="sr-only">（すべて完了）</span>
                    )}
                    {hasLoop && (
                      <>
                        <Repeat className="size-3" aria-hidden />
                        <span className="sr-only">定期タスクあり</span>
                      </>
                    )}
                  </span>
                </span>
              </Button>
            </RoadmapRow>
          );
        }}
      />

      <RoadmapRow node={<AddNode />} className="py-2">
        <SubgoalAddForm
          count={subgoals.length}
          canAdd={canAddSubgoal}
          onAdd={onAdd}
          className="pl-2"
        />
      </RoadmapRow>

      <RoadmapRow node={<GoalNode />}>
        <Button
          type="button"
          variant="ghost"
          onClick={onGoalClick}
          title={goalTitle || undefined}
          className="h-auto w-full min-w-0 justify-start px-2 py-1.5 text-left"
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-xs font-normal text-muted-foreground">
              Goal
            </span>
            <span
              className={cn(
                "truncate text-base",
                !goalTitle && "font-normal text-muted-foreground"
              )}
            >
              {goalTitle || "ゴール未設定"}
            </span>
          </span>
        </Button>
      </RoadmapRow>

      <DeleteSubgoalDialog
        subgoal={pendingDelete}
        label={
          pendingDelete && pendingIndex !== -1
            ? subgoalLabel(pendingDelete, pendingIndex)
            : ""
        }
        onConfirm={(id) => {
          onDelete(id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
        getReturnFocusTarget={() => {
          const trigger = deleteTriggerRef.current;
          deleteTriggerRef.current = null;
          if (trigger?.isConnected) return trigger;
          return (
            navRef.current?.querySelector<HTMLElement>("[aria-current]") ?? null
          );
        }}
      />
    </nav>
  );
}

/* ---------------------------------------------------------
 * レイアウト：[ハンドル --handle-col][ノード 1.25rem][本文][末尾]
 * -------------------------------------------------------*/

function RoadmapRow({
  handle,
  node,
  trailing,
  children,
  className,
}: {
  handle?: ReactNode;
  node: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative grid grid-cols-[var(--handle-col)_1.25rem_minmax(0,1fr)_auto] items-center py-0.5",
        className
      )}
    >
      <div className="flex justify-center">{handle}</div>
      <div className="relative z-1 flex justify-center">{node}</div>
      <div className="min-w-0">{children}</div>
      <div className="flex justify-end">{trailing}</div>
    </div>
  );
}

/* ---------------------------------------------------------
 * ノード（丸印）。完了状態は DB 設計後にここへ追加する
 * -------------------------------------------------------*/

// 縦線を隠すため、ノードは背後の面と同じ色で塗る。
// 面の色は置き場所（PC のサイド欄 / スマホの Sheet）が --roadmap-surface で渡す。未指定ならカード色
const nodeFill = "bg-[var(--roadmap-surface,var(--card))]";

function StartNode() {
  return (
    <span
      aria-hidden
      className={cn(
        "block size-3 rounded-full border-2 border-muted-foreground",
        nodeFill
      )}
    />
  );
}

function SubgoalNode({
  selected,
  completed,
}: {
  selected: boolean;
  /** すべてのタスクが完了したサブゴールは ✓ で示す */
  completed: boolean;
}) {
  if (completed) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground",
          selected && "shadow-[0_0_0_4px] shadow-primary/20"
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "block size-3.5 rounded-full border-2",
        selected
          ? "border-primary bg-primary shadow-[0_0_0_4px] shadow-primary/20"
          : cn("border-muted-foreground", nodeFill)
      )}
    />
  );
}

function AddNode() {
  return (
    <span
      aria-hidden
      className={cn(
        "block size-2.5 rounded-full border border-dashed border-muted-foreground",
        nodeFill
      )}
    />
  );
}

function GoalNode() {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 items-center justify-center rounded-full border-2 border-primary",
        nodeFill
      )}
    >
      <span className="block size-2 rounded-full bg-primary" />
    </span>
  );
}
