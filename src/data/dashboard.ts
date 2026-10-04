export type AttentionItem = {
  title: string;
  subtitle: string;
  tone: "red" | "blue" | "amber";
};

export type ProjectItem = {
  title: string;
  subtitle: string;
  progress: number;
  status: string;
};

export const attentionItems: AttentionItem[] = [
  {
    title: "JAN OS",
    subtitle: "Grundsystem im Aufbau",
    tone: "blue"
  },
  {
    title: "Kalender",
    subtitle: "Integration vorbereitet",
    tone: "amber"
  },
  {
    title: "Projektzentrale",
    subtitle: "Datenmodell als Nächstes",
    tone: "red"
  }
];

export const projects: ProjectItem[] = [
  {
    title: "JAN OS",
    subtitle: "Dashboard & Systemarchitektur",
    progress: 28,
    status: "Fundament"
  },
  {
    title: "Projekt A",
    subtitle: "Demo-Daten · später Live-Daten",
    progress: 62,
    status: "Aktiv"
  },
  {
    title: "Projekt B",
    subtitle: "Demo-Daten · später Live-Daten",
    progress: 41,
    status: "Planung"
  }
];
