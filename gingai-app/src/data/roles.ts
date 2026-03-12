import type { Role } from '../types';

export const ROLES: Role[] = [
  {
    id: 'athlete',
    name: 'Rasmus',
    initial: 'R',
    label: 'Athlete',
    screens: ['backbone', 'capture'],
  },
  {
    id: 'coach',
    name: 'Felipe',
    initial: 'F',
    label: 'Coach',
    screens: ['backbone', 'capture', 'intel', 'debrief'],
  },
  {
    id: 'analyst',
    name: 'Ana',
    initial: 'A',
    label: 'Analyst',
    screens: ['backbone', 'capture', 'intel', 'debrief'],
  },
];

export const DEFAULT_ROLE = ROLES[0];
