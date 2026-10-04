export type PlanningKind = "Termin" | "Deadline" | "Fokus";

export type PlanningSource = "Projekt" | "KISS" | "Gesundheit" | "Leben";

export type PlanningItem = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  kind: PlanningKind;
  source: PlanningSource;
  sourceLabel: string;
};

export const PLANNING_STORAGE_KEY = "jan-os-planning-items-v1";
export const PLANNING_EVENT = "jan-os-planning-updated";

export function readPlanningItems(): PlanningItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(PLANNING_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writePlanningItems(items: PlanningItem[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(PLANNING_EVENT));
}

export function removePlanningItem(id: string) {
  writePlanningItems(readPlanningItems().filter(item => item.id !== id));
}
