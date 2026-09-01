/**
 * The Season 6 calendar — one list shared by the day backbone and the console,
 * so the two screens can never disagree about which regattas exist or which
 * one is on.
 *
 * Extracted from DayBackbone, where it lived as screen-local state; the
 * console previously hardcoded a single venue and race day instead.
 */

export type RaceEntry  = { id: string; start: string; end: string; final?: boolean };

export interface Regatta {
	id: string; city: string; short: string; dates: string;
	start: string; end: string; lat: number; lon: number;
	photo: string; photoPos: string; days: string[];
	timezone?: string;
	raceDayIndices?: number[];
	raceSchedule?: Record<number, { broadcast: string; races: RaceEntry[] }>;
	weekAgenda?:  Record<number, { time: string; title: string; tag?: string; tagColor?: string }[]>;
}

/* The test venue below is alpha-only, gated on the same flag as the Human
   Learning Lab roster and the temporary console tools. */
const IS_ALPHA = process.env.NEXT_PUBLIC_TEAM === 'hll';

export const REGATTAS: Regatta[] = [
	{ id: 'perth',       city: 'Perth',          short: 'Perth',        dates: 'Jan 17–18',     start: '2026-01-17', end: '2026-01-18', lat: -31.95,  lon: 115.86,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'auckland',    city: 'Auckland',       short: 'Auckland',     dates: 'Feb 14–15',     start: '2026-02-14', end: '2026-02-15', lat: -36.85,  lon: 174.76,  photo: '/images/boat-auckland.jpg',     photoPos: 'center 60%',    days: ['Day 1', 'Day 2'] },
	{ id: 'sydney',      city: 'Sydney',         short: 'Sydney',       dates: 'Feb 28–Mar 1',  start: '2026-02-28', end: '2026-03-01', lat: -33.87,  lon: 151.21,  photo: '/images/boat-sydney.jpg',       photoPos: 'center 40%',    days: ['Day 1', 'Day 2'] },
	{ id: 'rio',         city: 'Rio de Janeiro', short: 'Rio',          dates: 'Apr 11–12',     start: '2026-04-11', end: '2026-04-12', lat: -22.91,  lon: -43.17,  photo: '/images/boat-rio.jpg',          photoPos: 'center 70%',    days: ['Day 1', 'Day 2'] },
	{ id: 'bermuda',     city: 'Bermuda',        short: 'Bermuda',      dates: 'May 10–11',     start: '2026-05-10', end: '2026-05-11', lat:  32.30,  lon: -64.78,  photo: '/images/boat-bermuda.jpg',      photoPos: 'center 50%',    days: ['Day 1', 'Day 2'] },
	{
		id: 'newyork', city: 'New York', short: 'New York', dates: 'May 28–Jun 1',
		start: '2026-05-28', end: '2026-06-01',
		timezone: 'America/New_York',
		lat: 40.65, lon: -74.02, photo: '/images/boat-newyork.jpg', photoPos: 'center 70%',
		days: ['Thu · 28', 'Fri · 29', 'Sat · 30', 'Sun · 31', 'Mon · 1'],
		raceDayIndices: [2, 3],
		raceSchedule: {
			2: {
				broadcast: '15:30–17:00',
				races: [
					{ id: 'R1', start: '15:39', end: '15:51' },
					{ id: 'R2', start: '15:58', end: '16:10' },
					{ id: 'R3', start: '16:18', end: '16:30' },
					{ id: 'R4', start: '16:40', end: '16:52' },
				],
			},
			3: {
				broadcast: '15:30–17:00',
				races: [
					{ id: 'R5', start: '15:38', end: '15:50' },
					{ id: 'R6', start: '15:58', end: '16:10' },
					{ id: 'R7', start: '16:18', end: '16:30' },
					{ id: 'Final', start: '16:39', end: '16:50', final: true },
				],
			},
		},
		weekAgenda: {
			0: [
				{ time: '14:30', title: 'Simulator session 1',                                      tag: 'Sim',   tagColor: 'var(--text3)' },
				{ time: '15:00', title: 'Simulator session 2',                                      tag: 'Sim',   tagColor: 'var(--text3)' },
				{ time: '16:00', title: 'SailGP team meeting — Hilton Hotel',                       tag: 'Team',  tagColor: 'var(--text3)' },
				{ time: '20:00', title: 'Team dinner — Hilton Hotel',                               tag: 'Team',  tagColor: 'var(--text3)' },
			],
			1: [
				{ time: '08:10', title: 'Ubers leave hotel',                                                       tag: 'Hotel',  tagColor: 'var(--text3)' },
				{ time: '08:30', title: 'SIM (should be working) · until 09:30',                                   tag: 'Sim',    tagColor: 'var(--text3)' },
				{ time: '09:30', title: 'Boat jobs / gear check / area check — no warm up · until 13:00',          tag: 'Boat',   tagColor: 'var(--text3)' },
				{ time: '11:30', title: 'Social media filming — 10 min per sailor (exact schedule TBC tomorrow) · until 12:30', tag: 'Media', tagColor: 'var(--text4)' },
				{ time: '11:30', title: 'Prospects × Tech tour — Paul & Martine quick meet & greet · until 12:00', tag: 'Venue',  tagColor: 'var(--yellow)' },
				{ time: '13:00', title: 'Lunch near the tech site · until 14:00',                                  tag: 'Lunch',  tagColor: 'var(--text3)' },
				{ time: '14:00', title: 'Sailing team meeting — small group feedback · until 16:00',               tag: 'Team',   tagColor: 'var(--text3)' },
				{ time: '17:30', title: 'SIM — Marco & Mateus',                                                    tag: 'Sim',    tagColor: 'var(--text3)' },
			],
			4: [
				{ time: '09:00', title: 'Full weekend debrief',                                  tag: 'Debrief',  tagColor: 'var(--text3)' },
				{ time: '11:00', title: 'Data & video review',                                   tag: 'Learn',    tagColor: 'var(--text3)' },
				{ time: '15:00', title: 'Travel home',                                           tag: 'Travel',   tagColor: 'var(--text4)' },
			],
		},
	},
	{
		id: 'halifax', city: 'Halifax', short: 'Halifax', dates: 'Jun 17–21',
		start: '2026-06-17', end: '2026-06-21',
		timezone: 'America/Halifax',
		lat: 44.65, lon: -63.58, photo: '/images/boat-halifax.jpg', photoPos: 'center 50%',
		days: ['Wed · 17', 'Thu · 18', 'Fri · 19', 'Sat · 20', 'Sun · 21'],
		raceDayIndices: [3, 4],
		weekAgenda: {
			0: [],
			1: [],
			2: [],
		},
	},
	{ id: 'portsmouth',  city: 'Portsmouth',     short: 'Portsmouth',   dates: 'Jul 25–26',     start: '2026-07-25', end: '2026-07-26', lat:  50.80,  lon:  -1.08,  photo: '/images/boat-portsmouth.jpg',   photoPos: 'center 50%',    days: ['Day 1', 'Day 2'] },
	{ id: 'sassnitz',    city: 'Sassnitz',       short: 'Sassnitz',     dates: 'Aug 22–23',     start: '2026-08-22', end: '2026-08-23', lat:  54.52,  lon:  13.64,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'valencia',    city: 'Valencia',       short: 'Valencia',     dates: 'Sep 5–6',       start: '2026-09-05', end: '2026-09-06', lat:  39.47,  lon:  -0.38,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'geneva',      city: 'Geneva',         short: 'Geneva',       dates: 'Sep 19–20',     start: '2026-09-19', end: '2026-09-20', lat:  46.20,  lon:   6.14,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'dubai',       city: 'Dubai',          short: 'Dubai',        dates: 'Nov 21–22',     start: '2026-11-21', end: '2026-11-22', lat:  25.08,  lon:  55.13,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'abudhabi',    city: 'Abu Dhabi',      short: 'Grand Final',  dates: 'Nov 28–29',     start: '2026-11-28', end: '2026-11-29', lat:  24.47,  lon:  54.37,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },

	/* Not real regattas. Somewhere for developers to exercise a race day end to
	   end without writing into one the team is using — every artefact is keyed
	   by runId, so a fake venue keeps test records in their own corner of
	   Firestore and Storage. Several of them, so a test that spans regattas has
	   somewhere to move to, and a venue whose records get into a state worth
	   abandoning can simply be replaced. Only present when NEXT_PUBLIC_TEAM=hll,
	   so they cannot appear in the squad's picker. */
	...(IS_ALPHA ? [
		{
			id: 'kristiansand', city: 'Kristiansand', short: 'Kristiansand', dates: 'Dec 1–2 · TEST',
			start: '2026-12-01', end: '2026-12-02', lat: 58.15, lon: 7.99,
			photo: '', photoPos: 'center center', days: ['Day 1', 'Day 2'],
		},
		{
			id: 'oslo', city: 'Oslo', short: 'Oslo', dates: 'Dec 5–6 · TEST',
			start: '2026-12-05', end: '2026-12-06', lat: 59.91, lon: 10.75,
			photo: '', photoPos: 'center center', days: ['Day 1', 'Day 2'],
		},
		/* Replaces a first Sandvika, dropped from the picker once its response
		   rows were locked by probe writes the backend offers no way to remove.
		   Its records still sit under SandvikaRaceday*; nothing reads them. The
		   space here is stripped when the run id is built, giving
		   "Sandvikav2Raceday1Season6" — a separate venue to every store. */
		{
			id: 'sandvika-v2', city: 'Sandvika v2', short: 'Sandvika v2', dates: 'Dec 8–9 · TEST',
			start: '2026-12-08', end: '2026-12-09', lat: 59.89, lon: 10.53,
			photo: '', photoPos: 'center center', days: ['Day 1', 'Day 2'],
		},
		{
			id: 'sandvika-v3', city: 'Sandvika v3', short: 'Sandvika v3', dates: 'Dec 12–13 · TEST',
			start: '2026-12-12', end: '2026-12-13', lat: 59.89, lon: 10.53,
			photo: '', photoPos: 'center center', days: ['Day 1', 'Day 2'],
		},
	] : []),
];

export function getRegatResult(start: string, end: string): 'Past' | 'Active' | 'Upcoming' {
	const today = new Date(); today.setHours(0, 0, 0, 0);
	const s = new Date(start); const e = new Date(end); e.setHours(23, 59, 59, 999);
	if (today > e) return 'Past';
	if (today >= s) return 'Active';
	return 'Upcoming';
}

export function getDefaultRegat(): string {
	const active = REGATTAS.find(r => getRegatResult(r.start, r.end) === 'Active');
	if (active) return active.id;
	const next = REGATTAS.find(r => getRegatResult(r.start, r.end) === 'Upcoming');
	return next?.id ?? REGATTAS[REGATTAS.length - 1].id;
}

export function getDefaultDay(regatId: string): number {
	const regat = REGATTAS.find(r => r.id === regatId);
	if (!regat || getRegatResult(regat.start, regat.end) !== 'Active') return 0;
	const today = new Date(); today.setHours(0, 0, 0, 0);
	const start = new Date(regat.start);
	const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
	return Math.max(0, Math.min(diff, regat.days.length - 1));
}

