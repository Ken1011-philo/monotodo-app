import { useRef } from "react";
import { MoreVertical, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RowMenuItem = {
  label: string;
  icon?: LucideIcon;
  /** 指定するとチェック付きの項目になる */
  checked?: boolean;
  destructive?: boolean;
  /** trigger: メニューを開いた「︙」ボタン（ダイアログを閉じた後のフォーカス復帰先に使う） */
  onSelect: (trigger: HTMLElement | null) => void;
};

/**
 * 行の右端に置く「︙」メニュー（Google ToDo リストの行メニューに相当）。
 * 削除など頻度の低い操作をまとめ、行に並ぶボタンを減らす。
 */
export function RowMenu({
  label,
  items,
  className,
}: {
  /** 「︙」ボタンの読み上げ名（例：「◯◯のメニュー」） */
  label: string;
  items: RowMenuItem[];
  className?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    // modal={false}: メニューから確認ダイアログを開いても操作不能にならないようにする
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          className={cn("shrink-0 text-muted-foreground", className)}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-44"
        onCloseAutoFocus={(event) => {
          // 削除などで行ごと消えた場合は「︙」に戻さない（フォーカス先は利用側が決める）
          if (!triggerRef.current?.isConnected) event.preventDefault();
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const select = () => item.onSelect(triggerRef.current);
          return item.checked === undefined ? (
            <DropdownMenuItem
              key={item.label}
              variant={item.destructive ? "destructive" : "default"}
              onSelect={select}
            >
              {Icon && <Icon />}
              {item.label}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuCheckboxItem
              key={item.label}
              checked={item.checked}
              onSelect={select}
            >
              {item.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
