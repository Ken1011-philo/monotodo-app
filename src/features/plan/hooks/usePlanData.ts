import { useCallback, useEffect, useMemo, useState } from "react";

import { planRepository } from "@/repositories/planRepository";
import type {
  Goal,
  LoopTaskTemplate,
  PlanSubgoalNode,
  Task,
  UUID,
} from "@/types/domain";

type PlanState = {
  goal: Goal | null;
  subgoals: PlanSubgoalNode[];
};

type PlanStatus = {
  loading: boolean;
  error: string | null;
  savingGoal: boolean;
};

const SORT_GAP = 1024;

function computeSortKey(
  list: { sortKey: number }[],
  targetIndex: number
): number {
  if (list.length === 0) return SORT_GAP;
  if (targetIndex <= 0) return list[0].sortKey - SORT_GAP;
  if (targetIndex >= list.length) return list[list.length - 1].sortKey + SORT_GAP;

  const prev = list[targetIndex - 1]?.sortKey ?? 0;
  const next = list[targetIndex]?.sortKey ?? prev + SORT_GAP;
  return Math.floor((prev + next) / 2);
}

export function usePlanData() {
  const [plan, setPlan] = useState<PlanState>({ goal: null, subgoals: [] });
  const [status, setStatus] = useState<PlanStatus>({
    loading: false,
    error: null,
    savingGoal: false,
  });

  const subgoalMap = useMemo(() => {
    const map = new Map<UUID, PlanSubgoalNode>();
    plan.subgoals.forEach((s) => map.set(s.id, s));
    return map;
  }, [plan.subgoals]);

  const setError = useCallback((message: string | null) => {
    setStatus((prev) => ({ ...prev, error: message }));
  }, []);

  const loadPlan = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await planRepository.fetchPlan();
      setPlan({
        goal: data.goal,
        subgoals: data.subgoals,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load plan";
      setError(message);
    } finally {
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  }, [setError]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const saveGoalTitle = useCallback(
    async (title: string) => {
      const expectedRevision = plan.goal?.revision ?? null;
      setStatus((prev) => ({ ...prev, savingGoal: true, error: null }));
      try {
        const saved = await planRepository.saveGoalTitle({ title, expectedRevision });
        setPlan((prev) => ({ ...prev, goal: saved }));
        return saved;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save goal title";
        setError(message);
        if (message.toLowerCase().includes("conflict")) {
          await loadPlan();
        }
        throw error;
      } finally {
        setStatus((prev) => ({ ...prev, savingGoal: false }));
      }
    },
    [plan.goal, setError, loadPlan]
  );

  const addSubgoal = useCallback(
    async (title: string) => {
      const sortKey = computeSortKey(plan.subgoals, plan.subgoals.length);
      const created = await planRepository.createSubgoal({ title, sortKey });
      setPlan((prev) => ({
        ...prev,
        subgoals: [...prev.subgoals, { ...created, tasks: [], loopTaskTemplates: [] }],
      }));
      return created;
    },
    [plan.subgoals]
  );

  const updateSubgoalTitle = useCallback(
    async (subgoalId: UUID, title: string) => {
      const target = subgoalMap.get(subgoalId);
      if (!target) throw new Error("Subgoal not found");
      const updated = await planRepository.updateSubgoalTitle({
        subgoalId,
        title,
        expectedRevision: target.revision,
      });
      setPlan((prev) => ({
        ...prev,
        subgoals: prev.subgoals.map((s) => (s.id === subgoalId ? { ...s, ...updated } : s)),
      }));
      return updated;
    },
    [subgoalMap]
  );

  const setSubgoalManualCompleted = useCallback(
    async (subgoalId: UUID, manualCompleted: boolean) => {
      const target = subgoalMap.get(subgoalId);
      if (!target) throw new Error("Subgoal not found");
      const updated = await planRepository.setSubgoalManualCompleted({
        subgoalId,
        manualCompleted,
        expectedRevision: target.revision,
      });
      setPlan((prev) => ({
        ...prev,
        subgoals: prev.subgoals.map((s) => (s.id === subgoalId ? { ...s, ...updated } : s)),
      }));
      return updated;
    },
    [subgoalMap]
  );

  const deleteSubgoal = useCallback(
    async (subgoalId: UUID) => {
      const target = subgoalMap.get(subgoalId);
      if (!target) throw new Error("Subgoal not found");
      await planRepository.deleteSubgoal({
        subgoalId,
        expectedRevision: target.revision,
      });
      setPlan((prev) => ({
        ...prev,
        subgoals: prev.subgoals.filter((s) => s.id !== subgoalId),
      }));
    },
    [subgoalMap]
  );

  const moveSubgoal = useCallback(
    async (subgoalId: UUID, targetIndex: number) => {
      const nextSortKey = computeSortKey(plan.subgoals, targetIndex);
      const updated = await planRepository.moveSubgoal({
        subgoalId,
        targetSortKey: nextSortKey,
      });
      setPlan((prev) => ({
        ...prev,
        subgoals: updated.map((s) => {
          const existing = subgoalMap.get(s.id);
          return {
            ...s,
            tasks: existing?.tasks ?? [],
            loopTaskTemplates: existing?.loopTaskTemplates ?? [],
          };
        }),
      }));
      return updated;
    },
    [plan.subgoals, subgoalMap]
  );

  const addPlanItem = useCallback(
    async (subgoalId: UUID, title: string, isLoopTemplate: boolean) => {
      const subgoal = subgoalMap.get(subgoalId);
      if (!subgoal) throw new Error("Subgoal not found");
      const list = isLoopTemplate ? subgoal.loopTaskTemplates : subgoal.tasks;
      const sortKey = computeSortKey(list, list.length);
      const created = await planRepository.createPlanItem({
        subgoalId,
        title,
        sortKey,
        isLoopTemplate,
      });

      setPlan((prev) => ({
        ...prev,
        subgoals: prev.subgoals.map((s) => {
          if (s.id !== subgoalId) return s;
          if (isLoopTemplate) {
            return {
              ...s,
              loopTaskTemplates: [...s.loopTaskTemplates, created as LoopTaskTemplate],
            };
          }
          const taskWithGoal: Task = {
            ...(created as Task),
            goalId: subgoal.goalId,
          };
          return { ...s, tasks: [...s.tasks, taskWithGoal] };
        }),
      }));
      return created;
    },
    [subgoalMap]
  );

  const updatePlanItemTitle = useCallback(
    async (subgoalId: UUID, itemId: UUID, title: string, isLoopTemplate: boolean) => {
      const subgoal = subgoalMap.get(subgoalId);
      if (!subgoal) throw new Error("Subgoal not found");
      const current = isLoopTemplate
        ? subgoal.loopTaskTemplates.find((t) => t.id === itemId)
        : subgoal.tasks.find((t) => t.id === itemId);
      if (!current) throw new Error("Item not found");

      const updated = await planRepository.updatePlanItemTitle({
        itemId,
        title,
        isLoopTemplate,
        expectedRevision: current.revision,
      });

      setPlan((prev) => ({
        ...prev,
        subgoals: prev.subgoals.map((s) => {
          if (s.id !== subgoalId) return s;
          if (isLoopTemplate) {
            return {
              ...s,
              loopTaskTemplates: s.loopTaskTemplates.map((t) =>
                t.id === itemId ? (updated as LoopTaskTemplate) : t
              ),
            };
          }
          const taskWithGoal: Task = {
            ...(updated as Task),
            goalId: subgoal.goalId,
          };
          return {
            ...s,
            tasks: s.tasks.map((t) => (t.id === itemId ? taskWithGoal : t)),
          };
        }),
      }));
      return updated;
    },
    [subgoalMap]
  );

  const deletePlanItem = useCallback(
    async (subgoalId: UUID, itemId: UUID, isLoopTemplate: boolean) => {
      const subgoal = subgoalMap.get(subgoalId);
      if (!subgoal) throw new Error("Subgoal not found");
      const current = isLoopTemplate
        ? subgoal.loopTaskTemplates.find((t) => t.id === itemId)
        : subgoal.tasks.find((t) => t.id === itemId);
      if (!current) throw new Error("Item not found");

      await planRepository.deletePlanItem({
        itemId,
        subgoalId,
        isLoopTemplate,
        expectedRevision: current.revision,
      });

      setPlan((prev) => ({
        ...prev,
        subgoals: prev.subgoals.map((s) => {
          if (s.id !== subgoalId) return s;
          return isLoopTemplate
            ? { ...s, loopTaskTemplates: s.loopTaskTemplates.filter((t) => t.id !== itemId) }
            : { ...s, tasks: s.tasks.filter((t) => t.id !== itemId) };
        }),
      }));
    },
    [subgoalMap]
  );

  const movePlanItem = useCallback(
    async (
      subgoalId: UUID,
      itemId: UUID,
      targetIndex: number,
      isLoopTemplate: boolean
    ) => {
      const subgoal = subgoalMap.get(subgoalId);
      if (!subgoal) throw new Error("Subgoal not found");
      const list = isLoopTemplate ? subgoal.loopTaskTemplates : subgoal.tasks;
      const nextSortKey = computeSortKey(list, targetIndex);

      const updated = await planRepository.movePlanItem({
        itemId,
        subgoalId,
        targetSortKey: nextSortKey,
        isLoopTemplate,
      });

      setPlan((prev) => ({
        ...prev,
        subgoals: prev.subgoals.map((s) => {
          if (s.id !== subgoalId) return s;
          if (isLoopTemplate) {
            return { ...s, loopTaskTemplates: updated as LoopTaskTemplate[] };
          }
          const withGoal = (updated as Task[]).map((t) => ({ ...t, goalId: subgoal.goalId }));
          return { ...s, tasks: withGoal };
        }),
      }));
      return updated;
    },
    [subgoalMap]
  );

  const convertLoopTemplateToTask = useCallback(async (subgoalId: UUID, loopTemplateId: UUID) => {
    const subgoal = subgoalMap.get(subgoalId);
    if (!subgoal) throw new Error("Subgoal not found");

    const createdTask = await planRepository.convertLoopTemplateToTask({
      loopTemplateId,
    });

    setPlan((prev) => ({
      ...prev,
      subgoals: prev.subgoals.map((s) => {
        if (s.id !== subgoalId) return s;
        return {
          ...s,
          loopTaskTemplates: s.loopTaskTemplates.filter((t) => t.id !== loopTemplateId),
          tasks: [...s.tasks, { ...createdTask, goalId: subgoal.goalId }],
        };
      }),
    }));
    return createdTask;
  }, [subgoalMap]);

  const setLoopTemplateActive = useCallback(
    async (subgoalId: UUID, loopTemplateId: UUID, isActive: boolean) => {
      const subgoal = subgoalMap.get(subgoalId);
      if (!subgoal) throw new Error("Subgoal not found");
      const target = subgoal.loopTaskTemplates.find((t) => t.id === loopTemplateId);
      if (!target) throw new Error("Loop task template not found");

      const updated = await planRepository.setLoopTemplateActive({
        loopTemplateId,
        isActive,
        expectedRevision: target.revision,
      });

      setPlan((prev) => ({
        ...prev,
        subgoals: prev.subgoals.map((s) => {
          if (s.id !== subgoalId) return s;
          const list = s.loopTaskTemplates.map((t) =>
            t.id === loopTemplateId ? updated : t
          );
          const filtered = isActive ? list : list.filter((t) => t.id !== loopTemplateId);
          return { ...s, loopTaskTemplates: filtered };
        }),
      }));
      return updated;
    },
    [subgoalMap]
  );

  return {
    plan,
    status,
    reload: loadPlan,
    saveGoalTitle,
    addSubgoal,
    updateSubgoalTitle,
    setSubgoalManualCompleted,
    deleteSubgoal,
    moveSubgoal,
    addPlanItem,
    updatePlanItemTitle,
    deletePlanItem,
    movePlanItem,
    convertLoopTemplateToTask,
    setLoopTemplateActive,
  };
}
