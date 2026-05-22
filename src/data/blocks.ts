import type { Block } from '@/types';

type BlockSeed = Omit<Block, 'status'>;

const BLOCK_SEEDS: BlockSeed[] = [
  { id: '1320', time: '13:20', name: 'All Team — Tent',      panel: 'past',   tag: '',         tagColor: '',              tZeroOffset: -258 },
  { id: '1330', time: '13:30', name: 'Brief & Sim Brief',    panel: '1330',   tag: 'Learn',    tagColor: 'var(--text3)',   tZeroOffset: -248 },
  { id: '1400', time: '14:00', name: 'Simulator Session',    panel: 'past',   tag: '',         tagColor: '',              tZeroOffset: -218 },
  { id: '1430', time: '14:30', name: 'Brief the Day',        panel: '1430',   tag: 'Prime',    tagColor: 'var(--green)',   tZeroOffset: -188 },
  { id: '1500', time: '15:00', name: 'Warm Up',              panel: '1500',   tag: '',         tagColor: '',              tZeroOffset: -158 },
  { id: '1550', time: '15:50', name: 'Transfer to Yacht',    panel: '1550',   tag: 'Race',     tagColor: 'var(--yellow)', tZeroOffset: -108 },
  { id: '1620', time: '16:20', name: 'Dock Off',             panel: 'future', tag: 'Race',     tagColor: 'var(--yellow)', tZeroOffset: -78  },
  { id: '1738', time: '17:38', name: '🏁 R5 Start — T-Zero', panel: 'future', tag: 'Race 1',   tagColor: 'var(--green)',  tZeroOffset: 0    },
  { id: '1759', time: '17:59', name: 'R6 Start',             panel: 'future', tag: '',         tagColor: '',              tZeroOffset: 21   },
  { id: '1818', time: '18:18', name: 'R7 → Capture Opens',  panel: '1818',   tag: 'Capture',  tagColor: 'var(--red)',    tZeroOffset: 40   },
  { id: '1900', time: '19:00', name: 'Hot Wash',            panel: 'future', tag: '',         tagColor: '',              tZeroOffset: 82   },
  { id: '1930', time: '19:30', name: 'Team Debrief',        panel: 'future', tag: 'Debrief',  tagColor: 'var(--text3)',   tZeroOffset: 112  },
];

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function getBlocks(now: Date = new Date()): Block[] {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let nowIndex = -1;
  for (let i = 0; i < BLOCK_SEEDS.length; i++) {
    if (toMinutes(BLOCK_SEEDS[i].time) <= currentMinutes) nowIndex = i;
  }

  return BLOCK_SEEDS.map((b, i) => ({
    ...b,
    status: i < nowIndex ? 'past' : i === nowIndex ? 'now' : 'future',
  }));
}

// Static snapshot kept for any non-time-sensitive imports
export const BLOCKS: Block[] = getBlocks();
