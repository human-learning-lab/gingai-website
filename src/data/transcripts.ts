export type TranscriptLine = {
  speaker: string;
  text: string;
};

export type TranscriptSource = 'race' | 'capture' | 'debrief' | 'upload';

export type Transcript = {
  id: string;
  source: TranscriptSource;
  regatta: string;
  race: string;
  team: string;
  title: string;
  duration: string;
  lines: TranscriptLine[];
  avatarUrl?: string;
};
