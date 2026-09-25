import { useRef } from "react";

import { SectionHeader } from "@/components/common/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { usePlanDraft } from "@/features/plan/hooks/usePlanDraft";
import { GoalEditor } from "./GoalEditor";
import { PlanSidebar } from "./PlanSidebar";
import { SubgoalAddForm } from "./SubgoalAddForm";
import { SubgoalTaskPanel } from "./SubgoalTaskPanel";

/** Plan ページ：状態（usePlanDraft）と各部品をつなぐだけのコンテナ */
export default function PlanPage() {
  const plan = usePlanDraft();
  const goalInputRef = useRef<HTMLInputElement>(null);

  const { selectedSubgoal } = plan;
  const selectedIndex = selectedSubgoal
    ? plan.subgoals.findIndex((s) => s.id === selectedSubgoal.id)
    : -1;

  const focusGoalInput = () => {
    const input = goalInputRef.current;
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        as="h1"
        eyebrow="Plan"
        title="計画"
        description="目標をサブゴールとタスクに分解します。一番上のサブゴールのタスクが Do ページに表示されます。"
      />

      <div className="grid items-start gap-6 md:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden md:sticky md:top-6 md:block">
          <Card className="max-h-[calc(100vh-3rem)] overflow-y-auto px-2 py-4">
            <PlanSidebar
              goalTitle={plan.goalTitle}
              subgoals={plan.subgoals}
              selectedSubgoalId={selectedSubgoal?.id ?? null}
              canAddSubgoal={plan.canAddSubgoal}
              onSelect={plan.selectSubgoal}
              onMove={plan.moveSubgoal}
              onDelete={plan.deleteSubgoal}
              onAdd={plan.addSubgoal}
              onGoalClick={focusGoalInput}
            />
          </Card>
        </aside>

        <Card>
          <CardContent className="space-y-6">
            <GoalEditor
              savedTitle={plan.goalTitle}
              onSave={plan.saveGoalTitle}
              inputRef={goalInputRef}
            />

            <div className="border-t pt-6">
              {selectedSubgoal ? (
                <SubgoalTaskPanel
                  key={selectedSubgoal.id}
                  subgoal={selectedSubgoal}
                  index={selectedIndex}
                  total={plan.subgoals.length}
                  onRename={(title) =>
                    plan.renameSubgoal(selectedSubgoal.id, title)
                  }
                  onAddTask={() => plan.addTask(selectedSubgoal.id)}
                  onRenameTask={(taskId, title) =>
                    plan.renameTask(selectedSubgoal.id, taskId, title)
                  }
                  onToggleTaskLoop={(taskId) =>
                    plan.toggleTaskLoop(selectedSubgoal.id, taskId)
                  }
                  onDeleteTask={(taskId) =>
                    plan.deleteTask(selectedSubgoal.id, taskId)
                  }
                  onMoveTask={(activeId, overId) =>
                    plan.moveTask(selectedSubgoal.id, activeId, overId)
                  }
                />
              ) : (
                <EmptySubgoalState
                  count={plan.subgoals.length}
                  canAdd={plan.canAddSubgoal}
                  onAdd={plan.addSubgoal}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptySubgoalState({
  count,
  canAdd,
  onAdd,
}: {
  count: number;
  canAdd: boolean;
  onAdd: (title: string) => string | null;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-dashed px-4 py-6">
      <SectionHeader
        as="h3"
        eyebrow="Subgoal"
        title="サブゴールを追加しましょう"
        description="目標までの道のりを、いくつかの区切りに分けてみましょう。"
      />
      <SubgoalAddForm count={count} canAdd={canAdd} onAdd={onAdd} />
    </div>
  );
}
