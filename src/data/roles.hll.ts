import type { Role, ScreenId } from '@/types';

/**
 * Human Learning Lab — alpha test team.
 *
 * Active only when NEXT_PUBLIC_TEAM=hll. In that environment the HLL team
 * REPLACES the SailGP Brazil roster rather than extending it, so the app
 * shows only HLL members. With the flag unset nothing here is reachable and
 * production resolves to the SailGP roster exactly as before.
 */

const SAILOR_SCREENS: ScreenId[] = ['backbone', 'sim', 'capture', 'transcripts', 'library', 'alarms'];

/* First names only, matching the rest of the roster. The response screens
   fetch answers with `role.name`, and the backend keys rows by first name —
   "Daniel Martin" would never match the stored recipient "Daniel". */
export const HLL_ROLES: Role[] = [
  { id: 'hll-daniel',   name: 'Daniel', initial: 'DM', label: 'Helm', view: 'sailor', screens: SAILOR_SCREENS },
  { id: 'hll-benjamin', name: 'Benjamin', initial: 'BN', label: 'Helm', view: 'sailor', screens: SAILOR_SCREENS },
];

/**
 * Production roles carried into the alpha roster by id.
 *
 * `christian` is Christian Løkem — reusing his existing role keeps the roleId
 * stored on his Clerk profile valid in both environments, so it never flips.
 * The two developer roles are kept so Emilie and Viktor can still reach alpha;
 * without them they would land on /pending there. `rasmus` is carried for the
 * same reason as Christian, and because DEFAULT_ROLE resolves to him — leaving
 * him out left the fallback pointing at a role absent from the alpha roster.
 */
export const HLL_CARRIED_ROLE_IDS = ['christian', 'emilie', 'viktor', 'rasmus'];

/**
 * Replaces the production email map in alpha.
 * The daniel/denise address mismatch is intentional — leave it as is.
 */
export const HLL_EMAIL_ROLE_MAP: Record<string, string> = {
  'denise@hulelab.com':     'hll-daniel',
  'benjamin@hulelab.com':   'hll-benjamin',
  'christian@hulelab.com':  'christian',
  'emilie@sailgpbra.com':   'emilie',
  'viktor@sailgpbra.com':   'viktor',
  'rkostner@sailgpbra.com': 'rasmus',
};

/**
 * Replaces the production domain map in alpha.
 *
 * sailgpbra.com is deliberately absent. The crew already hold a role and alpha
 * now recognises every production one, so they are admitted without ever
 * reaching the assignment path. Mapping the domain would additionally admit any
 * future sailgpbra.com account, which is broader than intended.
 */
export const HLL_ALLOWED_DOMAINS: Record<string, string> = {
  'hulelab.com': 'christian',
};

/* ── Phase-console roster ──────────────────────────────────────
 * The console screens (Skeleton brief, Priming in, Capture, Captures in)
 * each keep their own `SAILORS` list, separate from ROLES above, because
 * their display labels and membership differ from the access roster.
 *
 * Alpha now shows the whole squad rather than replacing it with a three-person
 * test team: the additions below are appended to it. Anyone already on the
 * squad list — Christian and Rasmus are both on it — is not duplicated.
 *
 * Names here are first names: `recipients` is keyed by `sailor.name`, and
 * the Capture screen tags uploads with the Clerk first name.
 */

interface SailorLike { id: string; name: string; role: string; }

/** Testers who are not on the squad list. Both sail, so both feed the squad
 *  picture — unlike Christian, who is staff; see data/crew.ts. */
const HLL_EXTRA_SAILORS: SailorLike[] = [
  { id: 'hll-dan', name: 'Daniel',   role: 'Helm' },
  { id: 'hll-ben', name: 'Benjamin', role: 'Helm' },
];

/** Returns `base` untouched unless NEXT_PUBLIC_TEAM=hll, which appends the testers. */
export function teamSailors(base: SailorLike[]): SailorLike[] {
  if (process.env.NEXT_PUBLIC_TEAM !== 'hll') return base;
  const known = new Set(base.map((s) => s.name));
  return [...base, ...HLL_EXTRA_SAILORS.filter((s) => !known.has(s.name))];
}
