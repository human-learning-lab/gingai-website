/**
 * Who on the roster is staff rather than crew.
 *
 * HuleLab people appear in the console — they are sent questions, they answer,
 * their answers are read — but they do not sail. Their context file is a line
 * naming what they do, not a sailor profile, so it must never be folded into
 * the squad's collective picture: doing so would have the team file reasoning
 * about a CEO's foiling technique.
 *
 * This is the one place that decides it. The per-screen SAILORS lists carry the
 * role string; anything server-side that only has a name uses HULELAB_MEMBERS.
 */

export const HULELAB_ROLE = 'HuleLab';

/** Case-insensitive: the roster spelled it "Hulelab" in one screen for a while. */
export function isHuleLabRole(role: string | undefined | null): boolean {
  return (role ?? '').trim().toLowerCase() === HULELAB_ROLE.toLowerCase();
}

/**
 * By name, for the server routes that read context files out of Storage and
 * have no roster to consult — Storage keys on the sailor's first name only.
 */
export const HULELAB_MEMBERS = ['Christian', 'Benjamin'] as const;

export function isHuleLabMember(sailor: string): boolean {
  const name = sailor.trim().toLowerCase();
  return HULELAB_MEMBERS.some(m => m.toLowerCase() === name);
}
