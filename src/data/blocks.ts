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

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function seedsToBlocks(seeds: BlockSeed[], now: Date): Block[] {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let nowIndex = -1;
  for (let i = 0; i < seeds.length; i++) {
    if (toMinutes(seeds[i].time) <= currentMinutes) nowIndex = i;
  }
  return seeds.map((b, i) => ({
    ...b,
    status: i < nowIndex ? 'past' : i === nowIndex ? 'now' : 'future',
  }));
}

export function getBlocks(now: Date = new Date(), regatId?: string, dayIndex?: number): Block[] {
  if (regatId === 'newyork' && dayIndex === 2) return seedsToBlocks(NYC_SAT_SEEDS, now);
  if (regatId === 'newyork' && dayIndex === 3) return seedsToBlocks(NYC_SUN_SEEDS, now);
  return seedsToBlocks(GENERIC_SEEDS, now);
}

// Static snapshot kept for any non-time-sensitive imports
export const BLOCKS: Block[] = getBlocks();
