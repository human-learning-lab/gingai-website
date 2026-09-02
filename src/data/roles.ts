import type { Role } from '@/types';
import { HLL_ROLES, HLL_CARRIED_ROLE_IDS, HLL_EMAIL_ROLE_MAP, HLL_ALLOWED_DOMAINS } from './roles.hll';

const ALL_SCREENS = ['backbone', 'sim', 'capture', 'debrief', 'transcripts', 'library', 'alarms', 'race-summary'] as const;

const BASE_ROLES: Role[] = [
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



// Maps known email addresses to a roleId.
// Anyone from @sailgpbra.com who is NOT listed here gets 'christian' (analyst, all screens).
const BASE_EMAIL_ROLE_MAP: Record<string, string> = {
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

const BASE_ALLOWED_DOMAINS: Record<string, string> = {
  'sailgpbra.com': 'christian',  // analyst, all screens
  'hulelab.com':   'christian',  // developer fallback — specific devs mapped by email above
};

// ── Team selection ────────────────────────────────────────────
// Unset (production) resolves to exactly the SailGP Brazil roster above.
// NEXT_PUBLIC_TEAM=hll swaps in the Human Learning Lab test team for the
// alpha branch: the app then shows only HLL members. The flag is never set
// on Vercel Production, so merging this code to main reverts the behaviour
// on its own — nothing here needs to be undone before a merge.
const IS_HLL = process.env.NEXT_PUBLIC_TEAM === 'hll';

/* Alpha carries every production role, plus the HLL testers.
 *
 * It used to carry a handful by id, which left the rest of the squad signing in
 * with a perfectly good roleId that alpha did not recognise — ProtectedShell
 * failed its check, assign-role 403'd on the narrower alpha maps, and they
 * landed on /pending. Since the console roster now shows the whole squad, they
 * could be sent questions they could not open.
 *
 * This does not reassign anyone. The layout only writes a roleId when the
 * account has none or its email is in the alpha map, and neither is true for
 * these accounts — their stored role is simply recognised now. HLL_CARRIED_ROLE_IDS
 * is kept for the email map, which still needs to name who is reachable. */
export const ROLES: Role[] = IS_HLL
  ? [...BASE_ROLES, ...HLL_ROLES]
  : BASE_ROLES;

/* Alpha extends production rather than replacing it: anyone who can reach
   production can reach alpha, and a new crew member mapped once is mapped in
   both. It used to replace, so the two drifted — the crew were mapped in
   production and absent from alpha, and every alpha grant had to be made by
   hand against Clerk. The HLL entries come last so they win where they overlap. */
export const EMAIL_ROLE_MAP: Record<string, string> = IS_HLL
  ? { ...BASE_EMAIL_ROLE_MAP, ...HLL_EMAIL_ROLE_MAP }
  : BASE_EMAIL_ROLE_MAP;

/* Same for domains. sailgpbra.com was withheld from alpha so a crew member
   would not be silently reassigned in the shared Clerk instance — but with the
   email map now shared, everyone it covers resolves to the same role in both
   environments, so a write from alpha sets what production would have set. The
   domain is only reached by someone the email map does not name. */
export const ALLOWED_DOMAINS: Record<string, string> = IS_HLL
  ? { ...BASE_ALLOWED_DOMAINS, ...HLL_ALLOWED_DOMAINS }
  : BASE_ALLOWED_DOMAINS;

export const DEFAULT_ROLE = BASE_ROLES.find(r => r.id === 'rasmus')!;

/**
 * The role a signed-in account gets, by email, then domain, then first name.
 *
 * Undefined means no role, which means /pending. There is deliberately no
 * catch-all: the layout used to end in `?? 'christian'`, so any account that
 * reached a protected page was written a role and admitted — an open door that
 * nothing in the UI announced. Access now has to be granted by one of the three
 * maps below.
 *
 * Both the layout and /api/assign-role call this. They used to resolve access
 * differently, which is how an account the route refused could sit on /pending
 * holding a role the layout would have given it.
 */
export function resolveRoleId(email?: string, firstName?: string): string | undefined {
  const address = email?.toLowerCase().trim();
  const domain = address?.split('@')[1];
  const name = firstName?.toLowerCase().trim();

  return (
    (address ? EMAIL_ROLE_MAP[address] : undefined) ??
    (domain ? ALLOWED_DOMAINS[domain] : undefined) ??
    (name ? ROLES.find(r => r.name.toLowerCase().split(' ')[0] === name)?.id : undefined)
  );
}
