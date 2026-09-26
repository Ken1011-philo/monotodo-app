import { useState, type FormEvent, type Ref } from "react";
import { Check, Save } from "lucide-react";

import { Eyebrow } from "@/components/common/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GOAL_TITLE_LIMIT } from "@/features/plan/model/planDraft";
import { cn } from "@/lib/utils";

type GoalEditorProps = {
  savedTitle: string;
  onSave: (title: string) => void;
  /** サイドの Goal 項目からフォーカスを移すための ref */
  inputRef?: Ref<HTMLInputElement>;
};

const INPUT_ID = "plan-goal-title";

/** Goal タイトルの入力と保存。入力途中の値はこのコンポーネント内で持つ */
export function GoalEditor({ savedTitle, onSave, inputRef }: GoalEditorProps) {
  const [draft, setDraft] = useState(savedTitle);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const error =
    draft.length > GOAL_TITLE_LIMIT
      ? `Goalタイトルは${GOAL_TITLE_LIMIT}文字以内に収めてください`
      : null;
  const isDirty = draft !== savedTitle;

  const status = error ? (
    error
  ) : lastSavedAt && !isDirty ? (
    <>
      <Check className="size-3.5" />
      {lastSavedAt.toLocaleTimeString()} にローカル保存しました
    </>
  ) : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (error || !isDirty) return;
    onSave(draft);
    setLastSavedAt(new Date());
  }

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <Eyebrow>Goal</Eyebrow>
        <Label htmlFor={INPUT_ID} className="text-lg">
          達成したい目標
        </Label>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          id={INPUT_ID}
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="例：ギターが上手くなりたい"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={`${INPUT_ID}-status ${INPUT_ID}-count`}
          autoComplete="off"
        />

        {/* エラー / 保存完了は、表示するときだけ行を取る（空行を作らない） */}
        {status && (
          <p
            id={`${INPUT_ID}-status`}
            className={cn(
              "flex items-center gap-1 text-xs",
              error ? "font-medium text-destructive" : "text-primary"
            )}
          >
            {status}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={!isDirty || Boolean(error)}>
            <Save />
            Goal を保存
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDraft("")}
            disabled={!draft}
          >
            クリア
          </Button>
          <span
            id={`${INPUT_ID}-count`}
            className="ml-auto font-mono text-xs text-muted-foreground"
          >
            {draft.length}/{GOAL_TITLE_LIMIT}
          </span>
        </div>
      </form>
    </section>
  );
}
