import type { Block } from '@/types';

export const BLOCKS: Block[] = [
  { id: '1320', time: '13:20', name: 'All Team — Tent',      panel: 'past',   tag: '',         tagColor: '',              status: 'past',   tZeroOffset: -258 },
  { id: '1330', time: '13:30', name: 'Debrief & Sim Brief',  panel: '1330',   tag: 'Learn',    tagColor: 'var(--text3)',   status: 'past',   tZeroOffset: -248 },
  { id: '1400', time: '14:00', name: 'Simulator Session',    panel: 'past',   tag: '',         tagColor: '',              status: 'past',   tZeroOffset: -218 },
  { id: '1430', time: '14:30', name: 'Brief the Day',        panel: '1430',   tag: 'Prime',    tagColor: 'var(--green)',   status: 'now',    tZeroOffset: -188 },
  { id: '1500', time: '15:00', name: 'Warm Up',              panel: '1500',   tag: '',         tagColor: '',              status: 'future', tZeroOffset: -158 },
  { id: '1550', time: '15:50', name: 'Transfer to Yacht',    panel: '1550',   tag: 'Race',     tagColor: 'var(--yellow)', status: 'future', tZeroOffset: -108 },
  { id: '1620', time: '16:20', name: 'Dock Off',             panel: 'future', tag: 'Race',     tagColor: 'var(--yellow)', status: 'future', tZeroOffset: -78  },
  { id: '1738', time: '17:38', name: '🏁 R5 Start — T-Zero', panel: 'future', tag: 'Race 1',   tagColor: 'var(--green)',  status: 'future', tZeroOffset: 0    },
  { id: '1759', time: '17:59', name: 'R6 Start',             panel: 'future', tag: '',         tagColor: '',              status: 'future', tZeroOffset: 21   },
  { id: '1818', time: '18:18', name: 'R7 → Capture Opens',  panel: '1818',   tag: 'Capture',  tagColor: 'var(--red)',    status: 'future', tZeroOffset: 40   },
];
