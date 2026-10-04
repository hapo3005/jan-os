export type PlanningKind = "Termin" | "Deadline" | "Fokus" | "Zeitraum";

export type PlanningSource = "Projekt" | "KISS" | "Gesundheit" | "Leben";

export type SmartChecklistStatus = "open" | "done" | "check";

export type SmartChecklistItem = {
  id: string;
  label: string;
  detail?: string;
  status: SmartChecklistStatus;
};

export type SmartTimelineItem = {
  id: string;
  label: string;
  dueDate?: string;
  detail?: string;
  status: "open" | "done";
};

export type TravelPlan = {
  origin: string;
  destination: string;
  clinicArrivalWindow?: string;
  targetArrival?: string;
  routeHint?: string;
  lastChecked?: string;
  status: "check" | "ready";
  note?: string;
  searchUrl?: string;
  clinicTravelUrl?: string;
};

export type ClinicFact = {
  label: string;
  value: string;
};

export type EventBriefing = {
  generatedAt?: string;
  headline?: string;
  summary?: string;
  recommendation?: string;
  facts?: ClinicFact[];
  tips?: string[];
  checklist?: SmartChecklistItem[];
  travel?: TravelPlan;
  sources?: { label: string; url: string }[];
  refreshNote?: string;
};

export type HealthIntelligence = {
  generatedAt?: string;
  documents?: SmartChecklistItem[];
  packing?: SmartChecklistItem[];
  timeline?: SmartTimelineItem[];
  travel?: TravelPlan;
  facts?: ClinicFact[];
  sources?: { label: string; url: string }[];
};

export type PlanningItem = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  start: string;
  end: string;
  kind: PlanningKind;
  source: PlanningSource;
  sourceLabel: string;
  location?: string;
  status?: "fixed" | "option";
  dateOptions?: string[];
  intelligence?: HealthIntelligence;
  eventBriefing?: EventBriefing;
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
