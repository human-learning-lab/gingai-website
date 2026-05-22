// ─────────────────────────────────────────────────────────────
// Block content types — the data shape Viktor's backend populates.
// Every block accepts `data: XxxData | null`.
// null → show empty state.
// ─────────────────────────────────────────────────────────────

// ── 13:30 — Debrief & Sim Brief ──────────────────────────────
export interface DebriefBlockData {
  aiBriefSummary?: string;          // GingAI-generated debrief summary
  durationMinutes?: number;
  actionItems?: {
    text: string;
    owner: string;                  // sailor name
    due: string;                    // e.g. "today", "this week"
    priority: 'high' | 'medium';
  }[];
  goldenRulesPromoted?: {
    ruleNumber: number;
    text: string;
  }[];
  coachNotes?: string;              // free-text coach annotation
}

// ── 14:30 — Brief the Day ─────────────────────────────────────
export interface BriefingBlockData {
  conditions?: {
    wind: string;                   // e.g. "10–12"
    direction: string;              // e.g. "SSW"
    steadiness: string;             // e.g. "steady"
    course: string;                 // e.g. "Course 2"
    courseDetail?: string;          // e.g. "Mark A upwind"
  };
  documents?: {
    name: string;
    meta: string;
    type: 'Data' | 'Memory' | 'Video' | 'Actions' | 'File';
    url?: string;
  }[];
  aiBriefing?: string;              // GingAI race briefing text
  focusPoints?: {
    sailor: string;                 // name matching roles
    role: string;
    points: string[];
  }[];
  chatMessages?: {
    name: string;
    initial: string;
    time: string;
    text: string;
    isAI: boolean;
  }[];
  coachNotes?: string;
}

// ── 15:00 — Warm Up ──────────────────────────────────────────
export interface WarmUpBlockData {
  notes?: string;
  exercises?: {
    name: string;
    duration?: string;
    url?: string;
  }[];
}

// ── 15:50 — Transfer to Yacht / Gear Checklist ───────────────
export interface TransferBlockData {
  items?: string[];
  notes?: string;
}

// ── 18:18 — R7 → Capture Opens ───────────────────────────────
export interface CaptureBlockData {
  captureStatus: 'waiting' | 'open' | 'complete';
  sailors?: {
    name: string;
    initial: string;
    focus: string;
    done: boolean;
  }[];
  aiPreloadedContext?: string;
}
