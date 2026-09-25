import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { DraftSubgoal } from "@/features/plan/model/planDraft";

type DeleteSubgoalDialogProps = {
  /** 削除対象。null のときは閉じている */
  subgoal: DraftSubgoal | null;
  label: string;
  onConfirm: (subgoalId: string) => void;
  onCancel: () => void;
  /** 閉じた後にフォーカスを戻す先（Trigger を使わない制御コンポーネントのため） */
  getReturnFocusTarget: () => HTMLElement | null;
};

/** サブゴール削除の確認。含まれるタスク数を明示する */
export function DeleteSubgoalDialog({
  subgoal,
  label,
  onConfirm,
  onCancel,
  getReturnFocusTarget,
}: DeleteSubgoalDialogProps) {
  const taskCount = subgoal?.tasks.length ?? 0;

  return (
    <AlertDialog
      open={subgoal !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent
        className="bg-card"
        onCloseAutoFocus={(event) => {
          const target = getReturnFocusTarget();
          if (!target) return;
          event.preventDefault();
          target.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>「{label}」を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            {taskCount > 0
              ? `このサブゴールのタスク ${taskCount} 件も一緒に削除されます。`
              : "このサブゴールにタスクはありません。"}
            この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => subgoal && onConfirm(subgoal.id)}
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
