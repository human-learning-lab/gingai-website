import type { ScreenId } from '@/types';

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  /** Maps to a preview panel in TutorialModal */
  screen?: string;
  /** Development status shown as a badge in the tutorial card */
  status?: 'live' | 'demo' | 'soon' | 'beta';
  /** If set, step only shows to users whose role.view is in this list */
  requiredViews?: string[];
}

// To add or update steps in the future, only edit this array.
// The modal reads from it at runtime — no other changes needed.
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Ginga',
    screen: 'welcome',
    body: `Your real-time intelligence hub for Mubadala Brazil SailGP. Built to help the team capture, organise, and act on information across race days.\n\nLet's take a quick look at the four main sections.`,
  },
  {
    id: 'schedule',
    title: 'Schedule',
    screen: 'backbone',
    status: 'live',
    body: `Your race-day backbone. See the full event schedule, team status, weather, and what's coming up next — all in one place.`,
  },
  {
    id: 'livemode',
    title: 'Live Mode',
    screen: 'livemode',
    status: 'live',
    body: `On race days, tap Live Mode in the schedule timeline to enter a fullscreen command centre.\n\nShows the current block, T-Zero countdown, upcoming events, and live weather and tide conditions. Tap any block to see its content — the view auto-follows the schedule as the day progresses.`,
  },
  {
    id: 'gingai',
    title: 'GingAI',
    screen: 'gingai',
    status: 'beta',
    body: `Ask anything about the team, past races, or today's plan. GingAI pulls from your captures, transcripts, and debrief notes to answer in real time.\n\nAvailable at the bottom of the Schedule screen.`,
  },
  {
    id: 'capture',
    title: 'Capture',
    screen: 'capture',
    status: 'live',
    body: `Tap Record and speak naturally — Ginga transcribes in real time. Review, edit if needed, hit Save. Your note lands instantly in Transcripts.\n\nCaptures are personal — only you can see what you record.`,
  },
  {
    id: 'debrief',
    title: 'Debrief',
    screen: 'debrief',
    status: 'live',
    requiredViews: ['coach', 'analyst', 'developer'],
    body: `Post-race intelligence from team debrief sessions. Live session recording and transcripts are available.\n\nThe debrief agenda and topic analysis currently use demo data — real data feeds in as the pipeline is connected.`,
  },
  {
    id: 'transcripts',
    title: 'Transcripts',
    screen: 'transcripts',
    status: 'soon',
    body: `Everything captured by the team, in one searchable library. Filter by tag or date — nothing gets lost.\n\nGoes live once the database is connected.`,
  },
  {
    id: 'done',
    title: "You're all set",
    body: `Ginga is under active development. New features will arrive throughout the season and this tutorial will be updated to match.\n\nTap Tutorial in the sidebar anytime to come back here.`,
  },
];

// Keep ScreenId import used (avoids unused-import lint warnings)
export type { ScreenId };


