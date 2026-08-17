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

