import type { Role } from '@/types';

const ALL_SCREENS = ['backbone', 'sim', 'capture', 'debrief', 'transcripts', 'library', 'alarms', 'race-summary'] as const;

export const ROLES: Role[] = [
  // ── Sailing Crew ──────────────────────────────────────────────
  { id: 'martine', name: 'Martine', initial: 'MG', label: 'Helm / Driver',     view: 'sailor', avatar: '/images/team/martine.png',  screens: ['backbone', 'sim', 'capture', 'transcripts', 'library', 'alarms'] },
  { id: 'rasmus',  name: 'Rasmus',  initial: 'RK', label: 'Flight Controller', view: 'sailor', avatar: '/images/team/rasmus.png',   screens: ['backbone', 'sim', 'capture', 'transcripts', 'library', 'alarms'] },
  { id: 'pietro',  name: 'Pietro',  initial: 'PS', label: 'Wing Trimmer',      view: 'sailor', avatar: '/images/team/pietro.png',   screens: ['backbone', 'sim', 'capture', 'transcripts', 'library', 'alarms'] },
  { id: 'paul-g',  name: 'Paul G.', initial: 'PG', label: 'Strategist',        view: 'sailor', avatar: '/images/team/goodison.png', screens: ['backbone', 'sim', 'capture', 'transcripts', 'library', 'alarms'] },
  { id: 'mateus',  name: 'Mateus',  initial: 'MI', label: 'Grinder G1',        view: 'sailor', avatar: '/images/team/mateus.png',   screens: ['backbone', 'sim', 'capture', 'transcripts', 'library', 'alarms'] },
  { id: 'marina',  name: 'Marina',  initial: 'MA', label: 'Spare Sailor',        view: 'sailor', avatar: '/images/team/mateus.png',   screens: ['backbone', 'sim', 'capture', 'transcripts', 'library', 'alarms'] },
  { id: 'marco',   name: 'Marco',   initial: 'MC', label: 'Grinder G2',        view: 'sailor', avatar: '/images/team/marco.png',    screens: ['backbone', 'sim', 'capture', 'transcripts', 'library', 'alarms'] },
  { id: 'breno',   name: 'Breno',   initial: 'BK', label:  'Trim',             view: 'sailor' , screens: ['backbone', 'sim', 'capture', 'transcripts', 'library', 'alarms']},
  // ── Coaching & Analysis ───────────────────────────────────────
  { id: 'paul-b',  name: 'Paul B.', initial: 'PB', label: 'Senior Coach',      view: 'coach',   screens: [...ALL_SCREENS] },
  { id: 'richard', name: 'Rich', initial: 'RM', label: 'Coach / Booth',     view: 'coach',   screens: [...ALL_SCREENS] },
  { id: 'jeremy', name: 'Jeremy', initial: 'JM', label: 'Coach / Booth',     view: 'coach',   screens: [...ALL_SCREENS] },
  { id: 'nico',    name: 'Nico',    initial: 'N',  label: 'Analyst',           view: 'analyst', screens: [...ALL_SCREENS] },
  // ── Developer ─────────────────────────────────────────────────
  { id: 'emilie',  name: 'Emilie',  initial: 'EM', label: 'Developer',         view: 'developer', screens: [...ALL_SCREENS] },
  { id: 'viktor',  name: 'Viktor',  initial: 'VK', label: 'Developer',         view: 'developer', screens: [...ALL_SCREENS] },
  { id: 'christian', name: 'Christian', initial: 'CH', label: 'Team Member',   view: 'analyst',   screens: [...ALL_SCREENS] },
];

export const DEFAULT_ROLE = ROLES.find(r => r.id === 'rasmus')!;

// Maps known email addresses to a roleId.
// Anyone from @sailgpbra.com who is NOT listed here gets 'christian' (analyst, all screens).
export const EMAIL_ROLE_MAP: Record<string, string> = {
  // Sailing crew
  'mgrael@sailgpbra.com':       'martine',
  'rkostner@sailgpbra.com':     'rasmus',
  'pgoodison@sailgpbra.com':    'paul-g',
  'misaac@sailgpbra.com':       'mateus',
  'marndt@sailgpbra.com':       'marina',
  'psibello@sailgpbra.com':     'pietro',
  'marcograel@sailgpbra.com':   'marco',
  'bkneipp@sailgpbra.com':      'breno',
  // Coaching & analysis
  'jwilmot@sailgpbra.com':      'jeremy',
  'rmason@sailgpbra.com':       'richard',
  'ncarabelli@sailgpbra.com':   'nico',
  // Developers
  'emilie@sailgpbra.com':       'emilie',
  'viktor@sailgpbra.com':       'viktor',
  'christian@hulelab.com':      'christian',
};

export const ALLOWED_DOMAINS: Record<string, string> = {
  'sailgpbra.com': 'christian',  // analyst, all screens
  'hulelab.com':   'christian',  // developer fallback — specific devs mapped by email above
};
