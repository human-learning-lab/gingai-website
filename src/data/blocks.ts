import type { Block } from '@/types';

type BlockSeed = Omit<Block, 'status'>;

// ── Generic race day (used for all regattas except NYC) ────────
const GENERIC_SEEDS: BlockSeed[] = [
  { id: '1320', time: '13:20', name: 'All Team — Tent',       panel: 'tent',   tag: '',        tagColor: '',              tZeroOffset: -258 },
  { id: '1330', time: '13:30', name: 'Brief & Sim Brief',     panel: '1330',   tag: 'Learn',   tagColor: 'var(--text3)',   tZeroOffset: -248 },
  { id: '1400', time: '14:00', name: 'Simulator Session',     panel: 'sim',    tag: '',        tagColor: '',              tZeroOffset: -218 },
  { id: '1500', time: '15:00', name: 'Warm Up',               panel: '1500',   tag: '',        tagColor: '',              tZeroOffset: -158 },
  { id: '1550', time: '15:50', name: 'Transfer to Yacht',     panel: '1550',   tag: 'Race',    tagColor: 'var(--yellow)', tZeroOffset: -108 },
  { id: '1620', time: '16:20', name: 'Dock Off',              panel: 'future', tag: 'Race',    tagColor: 'var(--yellow)', tZeroOffset: -78  },
  { id: '1738', time: '17:38', name: '🏁 R1 Start — T-Zero',  panel: 'future', tag: 'Race 1',  tagColor: 'var(--green)',  tZeroOffset: 0    },
  { id: '1759', time: '17:59', name: 'R2 Start',              panel: 'future', tag: '',        tagColor: '',              tZeroOffset: 21   },
  { id: '1818', time: '18:18', name: 'R3 → Capture Opens',   panel: '1818',   tag: 'Capture', tagColor: 'var(--red)',    tZeroOffset: 40   },
  { id: '1930', time: '19:30', name: 'Team Debrief',          panel: '1930',   tag: 'Debrief', tagColor: 'var(--text3)',  tZeroOffset: 112  },
];

// ── NYC Saturday May 30 — R1–R4 (T-Zero = 15:39) ──────────────
const NYC_SAT_SEEDS: BlockSeed[] = [
  { id: 'ns-0930', time: '09:30', name: 'All Team — Tent',      panel: 'tent',   tag: '',        tagColor: '',              tZeroOffset: -369 },
  { id: 'ns-1000', time: '10:00', name: 'Brief & Sim Brief',    panel: '1330',   tag: 'Learn',   tagColor: 'var(--text3)',   tZeroOffset: -339 },
  { id: 'ns-1130', time: '11:30', name: 'Simulator Session',    panel: 'sim',    tag: '',        tagColor: '',              tZeroOffset: -249 },
  { id: 'ns-1230', time: '12:30', name: 'Warm Up',              panel: '1500',   tag: '',        tagColor: '',              tZeroOffset: -189 },
  { id: 'ns-1315', time: '13:15', name: 'Transfer to Yacht',    panel: '1550',   tag: 'Race',    tagColor: 'var(--yellow)', tZeroOffset: -144 },
  { id: 'ns-1345', time: '13:45', name: 'Dock Off',             panel: 'future', tag: 'Race',    tagColor: 'var(--yellow)', tZeroOffset: -114 },
  { id: 'ns-1530', time: '15:30', name: 'Broadcast Starts',     panel: 'future', tag: 'Live',    tagColor: 'var(--red)',    tZeroOffset: -9   },
  { id: 'ns-1539', time: '15:39', name: '🏁 R1 Start — T-Zero', panel: 'future', tag: 'Race 1',  tagColor: 'var(--green)',  tZeroOffset: 0    },
  { id: 'ns-1558', time: '15:58', name: 'R2 Start',             panel: 'future', tag: 'Race 2',  tagColor: 'var(--green)',  tZeroOffset: 19   },
  { id: 'ns-1618', time: '16:18', name: 'R3 Start',             panel: 'future', tag: 'Race 3',  tagColor: 'var(--green)',  tZeroOffset: 39   },
  { id: 'ns-1640', time: '16:40', name: 'R4 Start',             panel: 'future', tag: 'Race 4',  tagColor: 'var(--green)',  tZeroOffset: 61   },
  { id: 'ns-1710', time: '17:10', name: 'Dock In → Capture',   panel: '1818',   tag: 'Capture', tagColor: 'var(--red)',    tZeroOffset: 91   },
  { id: 'ns-1900', time: '19:00', name: 'Team Debrief',         panel: '1930',   tag: 'Debrief', tagColor: 'var(--text3)',  tZeroOffset: 201  },
];

// ── NYC Sunday May 31 — R5–R7 + Final (T-Zero = 15:38) ────────
const NYC_SUN_SEEDS: BlockSeed[] = [
  { id: 'nu-0930', time: '09:30', name: 'All Team — Tent',      panel: 'tent',   tag: '',        tagColor: '',              tZeroOffset: -368 },
  { id: 'nu-1000', time: '10:00', name: 'Brief & Sim Brief',    panel: '1330',   tag: 'Learn',   tagColor: 'var(--text3)',   tZeroOffset: -338 },
  { id: 'nu-1130', time: '11:30', name: 'Simulator Session',    panel: 'sim',    tag: '',        tagColor: '',              tZeroOffset: -248 },
  { id: 'nu-1300', time: '13:00', name: 'Warm Up',              panel: '1500',   tag: '',        tagColor: '',              tZeroOffset: -158 },
  { id: 'nu-1345', time: '13:45', name: 'Transfer to Yacht',    panel: '1550',   tag: 'Race',    tagColor: 'var(--yellow)', tZeroOffset: -113 },
  { id: 'nu-1415', time: '14:15', name: 'Dock Off',             panel: 'future', tag: 'Race',    tagColor: 'var(--yellow)', tZeroOffset: -83  },
  { id: 'nu-1530', time: '15:30', name: 'Broadcast Starts',     panel: 'future', tag: 'Live',    tagColor: 'var(--red)',    tZeroOffset: -8   },
  { id: 'nu-1538', time: '15:38', name: '🏁 R5 Start — T-Zero', panel: 'future', tag: 'Race 5',  tagColor: 'var(--green)',  tZeroOffset: 0    },
  { id: 'nu-1558', time: '15:58', name: 'R6 Start',             panel: 'future', tag: 'Race 6',  tagColor: 'var(--green)',  tZeroOffset: 20   },
  { id: 'nu-1618', time: '16:18', name: 'R7 Start',             panel: 'future', tag: 'Race 7',  tagColor: 'var(--green)',  tZeroOffset: 40   },
  { id: 'nu-1639', time: '16:39', name: '🏆 Final Start',        panel: 'future', tag: 'Final',   tagColor: 'var(--yellow)', tZeroOffset: 61   },
  { id: 'nu-1710', time: '17:10', name: 'Dock In → Capture',   panel: '1818',   tag: 'Capture', tagColor: 'var(--red)',    tZeroOffset: 92   },
  { id: 'nu-1900', time: '19:00', name: 'Team Debrief',         panel: '1930',   tag: 'Debrief', tagColor: 'var(--text3)',  tZeroOffset: 202  },
];

// ── Halifax simulator training day ────────────────────────────
// Each sim run uses panel:'future' so Live Mode shows the countdown clock.
// tZeroOffset is relative to Run 1 (Sim 1 = T-Zero for this day).
// Adjust times to match the actual Halifax sim schedule.
export const HALIFAX_SIM_SEEDS: BlockSeed[] = [
  { id: 'hs-0830', time: '08:30', name: 'Sim Brief & Objectives',  panel: 'sim-brief',   tag: 'Brief',   tagColor: 'var(--text3)', tZeroOffset: -30 },
  { id: 'hs-0900', time: '09:00', name: 'Simulator Session',       panel: 'future',      tag: 'Sim',     tagColor: 'var(--sim)',   tZeroOffset: 0   },
  { id: 'hs-1430', time: '14:30', name: 'Capture Window',          panel: '1818',        tag: 'Capture', tagColor: 'var(--red)',   tZeroOffset: 270 },
  { id: 'hs-1500', time: '15:00', name: 'Sim Debrief',             panel: 'sim-debrief', tag: 'Debrief', tagColor: 'var(--text3)', tZeroOffset: 300 },
];

// ── Halifax race day (R1–R4, placeholder times — adjust when schedule confirmed) ──
export const HALIFAX_RACE_SEEDS: BlockSeed[] = [
  { id: 'hr-1000', time: '10:00', name: 'All Team — Tent',               panel: 'tent',   tag: '',        tagColor: '',              tZeroOffset: -318 },
  { id: 'hr-1030', time: '10:30', name: 'Brief & Sim Brief',             panel: '1330',   tag: 'Learn',   tagColor: 'var(--text3)',   tZeroOffset: -288 },
  { id: 'hr-1200', time: '12:00', name: 'Simulator Session',             panel: 'sim',    tag: '',        tagColor: '',              tZeroOffset: -198 },
  { id: 'hr-1300', time: '13:00', name: 'Warm Up',                       panel: '1500',   tag: '',        tagColor: '',              tZeroOffset: -138 },
  { id: 'hr-1350', time: '13:50', name: 'Transfer to Yacht',             panel: '1550',   tag: 'Race',    tagColor: 'var(--yellow)', tZeroOffset: -88  },
  { id: 'hr-1420', time: '14:20', name: 'Dock Off',                      panel: 'future', tag: 'Race',    tagColor: 'var(--yellow)', tZeroOffset: -58  },
  { id: 'hr-1518', time: '15:18', name: '🏁 R1 Start — T-Zero',           panel: 'future', tag: 'Race 1',  tagColor: 'var(--green)',  tZeroOffset: 0    },
  { id: 'hr-1538', time: '15:38', name: 'R2 Start',                      panel: 'future', tag: 'Race 2',  tagColor: 'var(--green)',  tZeroOffset: 20   },
  { id: 'hr-1558', time: '15:58', name: 'R3 Start',                      panel: 'future', tag: 'Race 3',  tagColor: 'var(--green)',  tZeroOffset: 40   },
  { id: 'hr-1620', time: '16:20', name: 'R4 Start',                      panel: 'future', tag: 'Race 4',  tagColor: 'var(--green)',  tZeroOffset: 62   },
  { id: 'hr-1700', time: '17:00', name: 'Dock In → Capture',             panel: '1818',   tag: 'Capture', tagColor: 'var(--red)',    tZeroOffset: 102  },
  { id: 'hr-1900', time: '19:00', name: 'Team Debrief',                  panel: '1930',   tag: 'Debrief', tagColor: 'var(--text3)',  tZeroOffset: 222  },
];

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Returns hours + minutes in the given IANA timezone (falls back to browser local). */
export function getVenueHM(now: Date, timezone?: string): { h: number; m: number } {
  if (!timezone) return { h: now.getHours(), m: now.getMinutes() };
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone,
  }).formatToParts(now);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0');
  return { h: get('hour'), m: get('minute') };
}

/**
 * Signed seconds relative to a scheduled time in the venue's timezone.
 * Negative = before start, positive = elapsed after start.
 */
export function secsRelTZeroTZ(targetTime: string, now: Date, timezone?: string): number {
  const [th, tm] = targetTime.split(':').map(Number);
  if (!timezone) {
    const target = new Date(now);
    target.setHours(th, tm, 0, 0);
    return Math.floor((now.getTime() - target.getTime()) / 1000);
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: timezone,
  }).formatToParts(now);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0');
  const venueNowSecs = get('hour') * 3600 + get('minute') * 60 + get('second');
  const venueTargetSecs = th * 3600 + tm * 60;
  return Math.floor((now.getTime() - (now.getTime() - venueNowSecs * 1000 + venueTargetSecs * 1000)) / 1000);
}

function seedsToBlocks(seeds: BlockSeed[], now: Date, timezone?: string): Block[] {
  const { h, m } = getVenueHM(now, timezone);
  const currentMinutes = h * 60 + m;
  let nowIndex = -1;
  for (let i = 0; i < seeds.length; i++) {
    if (toMinutes(seeds[i].time) <= currentMinutes) nowIndex = i;
  }
  return seeds.map((b, i) => ({
    ...b,
    status: i < nowIndex ? 'past' : i === nowIndex ? 'now' : 'future',
  }));
}

export function getBlocks(now: Date = new Date(), regatId?: string, dayIndex?: number, timezone?: string): Block[] {
  if (regatId === 'newyork' && dayIndex === 2) return seedsToBlocks(NYC_SAT_SEEDS, now, timezone);
  if (regatId === 'newyork' && dayIndex === 3) return seedsToBlocks(NYC_SUN_SEEDS, now, timezone);
  if (regatId === 'sim-camp') return seedsToBlocks(HALIFAX_SIM_SEEDS, now, timezone);
  if (regatId === 'halifax')  return seedsToBlocks(HALIFAX_RACE_SEEDS, now, timezone);
  return seedsToBlocks(GENERIC_SEEDS, now, timezone);
}

// Static snapshot kept for any non-time-sensitive imports
export const BLOCKS: Block[] = getBlocks();
