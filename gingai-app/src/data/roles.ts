import type { Role } from '../types';

export const ROLES: Role[] = [
  {
    id: 'athlete',
    name: 'Rasmus',
    initial: 'R',
    label: 'Flight Controller',
    screens: ['backbone', 'capture'],
  },
  {
    id: 'coach',
    name: 'Paul',
    initial: 'PB',
    label: 'Coach',
    screens: ['backbone', 'capture', 'intel', 'debrief'],
  },
  {
    id: 'analyst',
    name: 'Nico',
    initial: 'N',
    label: 'Analyst',
    screens: ['backbone', 'capture', 'intel', 'debrief'],
  },
];

export const DEFAULT_ROLE = ROLES[0];
