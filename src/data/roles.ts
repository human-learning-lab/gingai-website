import type { Role } from '../types';

export const ROLES: Role[] = [
	// ── Sailing Crew ──────────────────────────────────────────────
	{ id: 'martine', name: 'Martine', initial: 'MG', label: 'Helm / Driver',     view: 'sailor', avatar: '/images/team/martine.png',  screens: ['backbone', 'capture', 'debrief'] },
	{ id: 'rasmus',  name: 'Rasmus',  initial: 'RK', label: 'Flight Controller', view: 'sailor', avatar: '/images/team/rasmus.png',   screens: ['backbone', 'capture', 'debrief'] },
	{ id: 'pietro',  name: 'Pietro',  initial: 'PS', label: 'Wing Trimmer',      view: 'sailor', avatar: '/images/team/pietro.png',   screens: ['backbone', 'capture', 'debrief'] },
	{ id: 'paul-g',  name: 'Paul G.', initial: 'PG', label: 'Strategist',        view: 'sailor', avatar: '/images/team/goodison.png', screens: ['backbone', 'capture', 'debrief'] },
	{ id: 'mateus',  name: 'Mateus',  initial: 'MI', label: 'Grinder G1',        view: 'sailor', avatar: '/images/team/mateus.png',   screens: ['backbone', 'capture', 'debrief'] },
	{ id: 'marco',   name: 'Marco',   initial: 'MC', label: 'Grinder G2',        view: 'sailor', avatar: '/images/team/marco.png',    screens: ['backbone', 'capture', 'debrief'] },
	// ── Coaching & Analysis ───────────────────────────────────────
	{ id: 'paul-b',  name: 'Paul B.', initial: 'PB', label: 'Senior Coach',      view: 'coach',   screens: ['backbone', 'capture', 'intel', 'debrief'] },
	{ id: 'richard', name: 'Richard', initial: 'RM', label: 'Coach / Booth',     view: 'coach',   screens: ['backbone', 'capture', 'intel', 'debrief'] },
	{ id: 'nico',    name: 'Nico',    initial: 'N',  label: 'Analyst',           view: 'analyst', screens: ['backbone', 'capture', 'intel', 'debrief'] },
];

export const DEFAULT_ROLE = ROLES.find(r => r.id === 'rasmus')!;
