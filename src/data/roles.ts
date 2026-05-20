import type { Role } from '@/types';

const ALL_SCREENS = ['backbone', 'capture', 'intel', 'debrief', 'transcripts'] as const;

export const ROLES: Role[] = [
  // ── Sailing Crew ──────────────────────────────────────────────
  { id: 'martine', name: 'Martine', initial: 'MG', label: 'Helm / Driver',     view: 'sailor', avatar: '/images/team/martine.png',  screens: ['backbone', 'capture', 'transcripts'] },
  { id: 'rasmus',  name: 'Rasmus',  initial: 'RK', label: 'Flight Controller', view: 'sailor', avatar: '/images/team/rasmus.png',   screens: ['backbone', 'capture', 'transcripts'] },
  { id: 'pietro',  name: 'Pietro',  initial: 'PS', label: 'Wing Trimmer',      view: 'sailor', avatar: '/images/team/pietro.png',   screens: ['backbone', 'capture', 'transcripts'] },
  { id: 'paul-g',  name: 'Paul G.', initial: 'PG', label: 'Strategist',        view: 'sailor', avatar: '/images/team/goodison.png', screens: ['backbone', 'capture', 'transcripts'] },
  { id: 'mateus',  name: 'Mateus',  initial: 'MI', label: 'Grinder G1',        view: 'sailor', avatar: '/images/team/mateus.png',   screens: ['backbone', 'capture', 'transcripts'] },
  { id: 'marco',   name: 'Marco',   initial: 'MC', label: 'Grinder G2',        view: 'sailor', avatar: '/images/team/marco.png',    screens: ['backbone', 'capture', 'transcripts'] },
  // ── Coaching & Analysis ───────────────────────────────────────
  { id: 'paul-b',  name: 'Paul B.', initial: 'PB', label: 'Senior Coach',      view: 'coach',   screens: [...ALL_SCREENS] },
  { id: 'richard', name: 'Richard', initial: 'RM', label: 'Coach / Booth',     view: 'coach',   screens: [...ALL_SCREENS] },
  { id: 'nico',    name: 'Nico',    initial: 'N',  label: 'Analyst',           view: 'analyst', screens: [...ALL_SCREENS] },
  // ── Developer ─────────────────────────────────────────────────
  { id: 'emilie',  name: 'Emilie',  initial: 'EM', label: 'Developer',         view: 'developer', screens: [...ALL_SCREENS] },
  { id: 'viktor',  name: 'Viktor',  initial: 'VK', label: 'Developer',         view: 'developer', screens: [...ALL_SCREENS] },
  { id: 'christian', name: 'Christian', initial: 'CH', label: 'Team Member',   view: 'analyst',   screens: [...ALL_SCREENS] },
];

export const DEFAULT_ROLE = ROLES.find(r => r.id === 'rasmus')!;
