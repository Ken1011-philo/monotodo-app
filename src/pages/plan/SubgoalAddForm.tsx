import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_SUBGOALS } from "@/features/plan/model/planDraft";
import { cn } from "@/lib/utils";

type SubgoalAddFormProps = {
  count: number;
  canAdd: boolean;
  /** 追加できた場合は新しいサブゴールの ID を返す */
  onAdd: (title: string) => string | null;
  className?: string;
};

/** サブゴール追加の入力欄。サイドのロードマップと空の状態で共用する */
export function SubgoalAddForm({
  count,
  canAdd,
  onAdd,
  className,
}: SubgoalAddFormProps) {
  const [draft, setDraft] = useState("");
  const canSubmit = canAdd && draft.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    if (onAdd(draft)) setDraft("");
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-1.5", className)}>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // IME 確定の Enter では送信しない
            if (event.key === "Enter" && event.nativeEvent.isComposing) {
              event.preventDefault();
            }
          }}
          placeholder={canAdd ? "サブゴールを追加" : "上限に達しています"}
          aria-label="追加するサブゴールのタイトル"
          disabled={!canAdd}
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!canSubmit}
          aria-label="サブゴールを追加"
          className="shrink-0"
        >
          <Plus />
        </Button>
      </div>
      {!canAdd && (
        <p className="text-xs text-destructive">
          サブゴールは {MAX_SUBGOALS} 件が上限です（{count}/{MAX_SUBGOALS}）
        </p>
      )}
    </form>
  );
}
