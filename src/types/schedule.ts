export interface ScheduleEvent {
  id: string;
  time: string;        // "14:30" or "—"
  label: string;       // display name
  tag: string;
  tagColor?: string;
  driveUrl?: string;   // Google Drive link (opens in new tab)
  notes?: string;
  panelKey?: string;   // maps to block.panel for rich content rendering
  tZeroOffset?: number; // preserved from race blocks for T-Zero tracking
}

export interface TemplateGroup {
  group: string;
  events: Omit<ScheduleEvent, 'id'>[];
}

export const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    group: 'Logistics',
    events: [
      { time: '08:00', label: 'Hotel departure',        tag: 'Hotel',  tagColor: 'var(--text3)' },
      { time: '08:30', label: 'Transfer to tech site',  tag: 'Venue',  tagColor: 'var(--yellow)' },
      { time: '13:00', label: 'Lunch',                  tag: 'Lunch',  tagColor: 'var(--text3)' },
      { time: '18:00', label: 'Travel home',            tag: 'Travel', tagColor: 'var(--text4)' },
    ],
  },
  {
    group: 'Boat',
    events: [
      { time: '09:00', label: 'Boat prep',        tag: 'Boat', tagColor: 'var(--text3)' },
      { time: '09:00', label: 'Gear check',       tag: 'Boat', tagColor: 'var(--text3)' },
      { time: '10:00', label: 'Sailing session',  tag: 'Race', tagColor: 'var(--yellow)' },
      { time: '14:20', label: 'Dock off',         tag: 'Race', tagColor: 'var(--yellow)' },
      { time: '17:00', label: 'Dock in',          tag: 'Race', tagColor: 'var(--yellow)' },
    ],
  },
  {
    group: 'Team',
    events: [
      { time: '09:00', label: 'Team meeting',        tag: 'Team',  tagColor: 'var(--text3)' },
      { time: '09:00', label: 'SIM session',         tag: 'Sim',   tagColor: 'var(--text3)' },
      { time: '17:00', label: 'Data & video review', tag: 'Learn', tagColor: 'var(--text3)' },
      { time: '11:30', label: 'Media',               tag: 'Media', tagColor: 'var(--text4)' },
      { time: '20:00', label: 'Team dinner',         tag: 'Team',  tagColor: 'var(--text3)' },
    ],
  },
  {
    group: 'Race day',
    events: [
      { time: '10:00', label: 'All team — Tent',      tag: '',        tagColor: '',                 panelKey: 'tent' },
      { time: '10:30', label: 'Brief & Sim Brief',    tag: 'Learn',   tagColor: 'var(--text3)',     panelKey: '1330' },
      { time: '12:00', label: 'Simulator Session',    tag: 'Sim',     tagColor: 'var(--text3)',     panelKey: 'sim' },
      { time: '13:00', label: 'Warm up',              tag: '',        tagColor: '',                 panelKey: '1500' },
      { time: '13:50', label: 'Transfer to Yacht',    tag: 'Race',    tagColor: 'var(--yellow)',    panelKey: '1550' },
      { time: '17:00', label: 'Dock in → Capture',   tag: 'Capture', tagColor: 'var(--red)',       panelKey: '1818' },
      { time: '19:00', label: 'Team debrief',         tag: 'Debrief', tagColor: 'var(--text3)',     panelKey: '1930' },
    ],
  },
];
