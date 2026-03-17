export type RoleId = string;
export type ScreenId = 'backbone' | 'capture' | 'intel' | 'debrief';

/** view determines which UX mode the person sees */
export type RoleView = 'sailor' | 'coach' | 'analyst';

export interface Role {
  id: RoleId;
  name: string;
  initial: string;
  label: string;
  view: RoleView;
  /** Which screens this role can access */
  screens: ScreenId[];
}

export interface Block {
  id: string;
  time: string;
  name: string;
  /** Which block-view panel to show: '1330' | '1430' | '1818' | 'past' | 'future' */
  panel: string;
  tag: string;
  tagColor?: string;
  status: 'past' | 'now' | 'future';
  /** Minutes relative to Race 1 (T-0). Negative = before race, 0 = race start, positive = after */
  tZeroOffset?: number;
}
