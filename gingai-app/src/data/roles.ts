import type { Role } from '../types';

export const ROLES: Role[] = [
  // ── Sailing Crew ──────────────────────────────────────────────
  { id: 'martine', name: 'Martine', initial: 'MG', label: 'Helm / Driver',     view: 'sailor', screens: ['backbone', 'capture'] },
  { id: 'rasmus',  name: 'Rasmus',  initial: 'RK', label: 'Flight Controller', view: 'sailor', screens: ['backbone', 'capture'] },
  { id: 'pietro',  name: 'Pietro',  initial: 'PS', label: 'Wing Trimmer',      view: 'sailor', screens: ['backbone', 'capture'] },
  { id: 'paul-g',  name: 'Paul G.', initial: 'PG', label: 'Strategist',        view: 'sailor', screens: ['backbone', 'capture'] },
  { id: 'mateus',  name: 'Mateus',  initial: 'MI', label: 'Grinder G1',        view: 'sailor', screens: ['backbone', 'capture'] },
  { id: 'marco',   name: 'Marco',   initial: 'MC', label: 'Grinder G2',        view: 'sailor', screens: ['backbone', 'capture'] },
  // ── Coaching & Analysis ───────────────────────────────────────
  { id: 'paul-b',  name: 'Paul B.', initial: 'PB', label: 'Senior Coach',      view: 'coach',   screens: ['backbone', 'capture', 'intel', 'debrief'] },
  { id: 'richard', name: 'Richard', initial: 'RM', label: 'Coach / Booth',     view: 'coach',   screens: ['backbone', 'capture', 'intel', 'debrief'] },
  { id: 'nico',    name: 'Nico',    initial: 'N',  label: 'Analyst',           view: 'analyst', screens: ['backbone', 'capture', 'intel', 'debrief'] },
];

export const DEFAULT_ROLE = ROLES.find(r => r.id === 'rasmus')!;
