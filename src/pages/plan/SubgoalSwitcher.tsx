import { useState, type ReactNode } from "react";
import { ChevronDown, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type SubgoalSwitcherProps = {
  /** 選択中サブゴールの表示名（未選択なら null） */
  currentLabel: string | null;
  /** 1 始まりの位置（未選択なら 0） */
  position: number;
  total: number;
  /**
   * Sheet の中身。closeThen(fn) で Sheet を閉じ、閉じ終わった後に fn を実行する
   * （Radix のフォーカス復帰より後にフォーカスを移したい場合に使う）
   */
  children: (closeThen: (afterClose?: () => void) => void) => ReactNode;
};

/** スマホ用：現在地を示すバーと、ロードマップを引き出す Sheet */
export function SubgoalSwitcher({
  currentLabel,
  position,
  total,
  children,
}: SubgoalSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [afterClose, setAfterClose] = useState<(() => void) | null>(null);

  const closeThen = (next?: () => void) => {
    // 関数を state に入れるため updater 形式で渡す
    setAfterClose(() => next ?? null);
    setOpen(false);
  };

  const summary = currentLabel ?? "サブゴールを追加";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`サブゴール一覧を開く（現在：${summary}）`}
          className="h-11 w-full justify-start gap-2 px-3"
        >
          <Menu className="text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-left">{summary}</span>
          {total > 0 && (
            <span className="font-mono text-xs text-muted-foreground">
              {position}/{total}
            </span>
          )}
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[85vw] max-w-sm gap-0 overflow-y-auto bg-card"
        onCloseAutoFocus={(event) => {
          if (!afterClose) return;
          event.preventDefault();
          setAfterClose(null);
          afterClose();
        }}
      >
        <SheetHeader>
          <SheetTitle>ロードマップ</SheetTitle>
          {/* 画面上は省き、読み上げ用の説明だけ残す */}
          <SheetDescription className="sr-only">
            サブゴールを選ぶと、そのタスクが表示されます。
          </SheetDescription>
        </SheetHeader>
        <div className="px-2 pb-6">{children(closeThen)}</div>
      </SheetContent>
    </Sheet>
  );
}
