import type { ScheduleEvent } from '@/types/schedule';
import type { Block } from '@/types';

const KEY = (regattaId: string, day: number) => `schedule:${regattaId}:${day}`;

export function loadSchedule(regattaId: string, day: number): ScheduleEvent[] | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(KEY(regattaId, day));
    return raw ? (JSON.parse(raw) as ScheduleEvent[]) : null;
  } catch {
    return null;
  }
}

export function saveSchedule(regattaId: string, day: number, events: ScheduleEvent[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEY(regattaId, day), JSON.stringify(events));
  } catch { /* ignore storage quota errors */ }
}

let _uid = 0;
export function newId(): string {
  return `sev-${Date.now()}-${++_uid}`;
}

/** Convert existing timeline blocks to ScheduleEvents so first load looks identical to today. */
export function seedFromBlocks(blocks: Block[]): ScheduleEvent[] {
  return blocks.map(b => ({
    id: b.id,
    time: b.time,
    label: b.name,
    tag: b.tag ?? '',
    tagColor: b.tagColor,
    panelKey: b.panel !== 'future' ? b.panel : undefined,
    tZeroOffset: b.tZeroOffset,
  }));
}

/** Convert hardcoded weekAgenda items to ScheduleEvents. Filters out Hotel/Venue location markers. */
export function seedFromAgenda(
  items: { time: string; title: string; tag?: string; tagColor?: string }[],
): ScheduleEvent[] {
  return items
    .filter(i => i.tag !== 'Hotel' && i.tag !== 'Venue')
    .map((item, idx) => ({
      id: `agenda-${idx}`,
      time: item.time,
      label: item.title,
      tag: item.tag ?? '',
      tagColor: item.tagColor,
    }));
}
