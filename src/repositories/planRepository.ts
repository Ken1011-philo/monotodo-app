import { goalRepository } from "./goalRepository";
import { taskRepository } from "./taskRepository";
import type { PlanRepository as PlanRepositoryContract } from "@/types/domain";

export const planRepository: PlanRepositoryContract = {
  fetchPlan: () => goalRepository.fetchPlan(),
  saveGoalTitle: (input) => goalRepository.saveGoalTitle(input),

  createSubgoal: (input) => goalRepository.createSubgoal(input),
  updateSubgoalTitle: (input) => goalRepository.updateSubgoalTitle(input),
  setSubgoalManualCompleted: (input) => goalRepository.setSubgoalManualCompleted(input),
  deleteSubgoal: (input) => goalRepository.deleteSubgoal(input),
  moveSubgoal: (input) => goalRepository.moveSubgoal(input),

  createPlanItem: (input) => taskRepository.createPlanItem(input),
  updatePlanItemTitle: (input) => taskRepository.updatePlanItemTitle(input),
  movePlanItem: (input) => taskRepository.movePlanItem(input),
  deletePlanItem: (input) => taskRepository.deletePlanItem(input),
  convertLoopTemplateToTask: (input) => taskRepository.convertLoopTemplateToTask(input),
  setLoopTemplateActive: (input) => taskRepository.setLoopTemplateActive(input),
};

export type PlanRepository = typeof planRepository;
