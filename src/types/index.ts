export type RoleId = string;
export type ScreenId = 'backbone' | 'sim' | 'capture' | 'debrief' | 'transcripts' | 'library' | 'alarms' | 'race-summary';

export type RoleView = 'sailor' | 'coach' | 'analyst' | 'developer';

export interface Role {
  id: RoleId;
  name: string;
  initial: string;
  label: string;
  view: RoleView;
  avatar?: string;
  screens: ScreenId[];
  /** Keeps the account working — access, and a roleId already stored on a
   *  Clerk profile stays valid — while leaving the person out of every
   *  on-screen picker. For someone who should still be able to sign in but is
   *  no longer part of the crew. */
  hidden?: boolean;
}

export interface Block {
  id: string;
  time: string;
  name: string;
  panel: string;
  tag: string;
  tagColor?: string;
  status: 'past' | 'now' | 'future';
  tZeroOffset?: number;
}

export interface Sailor {
  id: string;
  name: string;
  role: string;
}

