// dnd-kit を使った汎用の縦並べ替えリスト。
// ドラッグはハンドル（renderItem に渡す handleProps を付けた要素）からのみ開始する。
// マウス / タッチ（Pointer）とキーボード（Space → ↑↓ → Space）に対応。
import type { CSSProperties, ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SortableHandleProps = {
  ref: (element: HTMLElement | null) => void;
  style: CSSProperties;
} & Record<string, unknown>;

export type SortableItemState = {
  handleProps: SortableHandleProps;
  isDragging: boolean;
};

type SortableListProps<T extends { id: string }> = {
  items: T[];
  onMove: (activeId: string, overId: string) => void;
  renderItem: (item: T, index: number, state: SortableItemState) => ReactNode;
  /** スクリーンリーダーの読み上げに使う項目名 */
  getItemLabel: (item: T, index: number) => string;
  as?: "ol" | "ul";
  className?: string;
  itemClassName?: string | ((item: T, state: { isDragging: boolean }) => string);
};

export function SortableList<T extends { id: string }>({
  items,
  onMove,
  renderItem,
  getItemLabel,
  as: List = "ul",
  className,
  itemClassName,
}: SortableListProps<T>) {
  const sensors = useSensors(
    // 数 px 動かすまでドラッグを始めない（ハンドルのクリックと区別する）
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const labelOf = (id: UniqueIdentifier) => {
    const index = items.findIndex((item) => item.id === id);
    return index === -1 ? "項目" : getItemLabel(items[index], index);
  };
  const positionOf = (id: UniqueIdentifier) =>
    items.findIndex((item) => item.id === id) + 1;

  const announcements: Announcements = {
    onDragStart: ({ active }) => `${labelOf(active.id)}を持ち上げました。`,
    onDragOver: ({ active, over }) =>
      over
        ? `${labelOf(active.id)}を${positionOf(over.id)}番目に移動します。`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${labelOf(active.id)}を${positionOf(over.id)}番目に置きました。`
        : `${labelOf(active.id)}を置きました。`,
    onDragCancel: ({ active }) =>
      `${labelOf(active.id)}の移動をキャンセルしました。`,
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      onMove(String(active.id), String(over.id));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "並べ替えるには Space キーで持ち上げ、上下の矢印キーで移動し、もう一度 Space キーで置きます。Esc キーでキャンセルします。",
        },
      }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <List className={className}>
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              id={item.id}
              className={(isDragging) =>
                typeof itemClassName === "function"
                  ? itemClassName(item, { isDragging })
                  : itemClassName
              }
            >
              {(state) => renderItem(item, index, state)}
            </SortableItem>
          ))}
        </List>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id,
  className,
  children,
}: {
  id: string;
  className: (isDragging: boolean) => string | undefined;
  children: (state: SortableItemState) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn("relative", isDragging && "z-10", className(isDragging))}
    >
      {children({
        isDragging,
        handleProps: {
          ref: setActivatorNodeRef,
          ...attributes,
          ...listeners,
          // タッチでのドラッグ中にページがスクロールしないようにする
          style: { touchAction: "none", cursor: isDragging ? "grabbing" : "grab" },
        },
      })}
    </li>
  );
}

/** 並べ替えハンドル。renderItem に渡された handleProps をそのまま渡す */
export function DragHandle({
  handleProps,
  label,
  className,
}: {
  handleProps: SortableHandleProps;
  label: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      className={cn("shrink-0 text-muted-foreground", className)}
      {...handleProps}
    >
      <GripVertical />
    </Button>
  );
}
