import { useState, type FormEvent, type Ref } from "react";
import { Check, Save } from "lucide-react";

import { Eyebrow } from "@/components/common/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GOAL_TITLE_LIMIT } from "@/features/plan/model/planDraft";

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
        <p className="text-sm text-muted-foreground">
          あいまいで短くても大丈夫です。やりたい事として言語化しておきましょう。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          id={INPUT_ID}
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="例：ギターが上手くなりたい（空欄でもOK）"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={`${INPUT_ID}-status`}
          autoComplete="off"
        />

        <div
          id={`${INPUT_ID}-status`}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
        >
          {error ? (
            <p className="font-medium text-destructive">{error}</p>
          ) : lastSavedAt && !isDirty ? (
            <p className="flex items-center gap-1 text-primary">
              <Check className="size-3.5" />
              {lastSavedAt.toLocaleTimeString()} にローカル保存しました
            </p>
          ) : (
            <p className="text-muted-foreground">空欄のままでも保存できます。</p>
          )}
          <span className="ml-auto font-mono text-muted-foreground">
            {draft.length}/{GOAL_TITLE_LIMIT}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
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
        </div>
      </form>
    </section>
  );
}
