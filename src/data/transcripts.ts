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

// Replace TRANSCRIPTS array with a fetch() call when database is ready
export function getTranscripts(): Transcript[] {
  return TRANSCRIPTS;
}

const TRANSCRIPTS: Transcript[] = [
  {
    id: 'perth-r1-gbr',
    source: 'race',
    regatta: 'Perth',
    race: 'R1',
    team: 'GBR',
    title: 'Post-Race Debrief',
    duration: '18:42',
    lines: [
      { speaker: 'Ben Ainslie', text: 'The start was clean but we lost ground on the first upwind leg. Port tack was lifting more than we anticipated.' },
      { speaker: 'Giles Scott', text: 'Agreed. Our pre-race data had the starboard side favoured, but the pressure was definitely sitting left for most of that leg.' },
      { speaker: 'Ben Ainslie', text: 'We need to be more aggressive with the early tack decision. By the time we committed we had already given away 30 metres to Australia.' },
      { speaker: 'Paul Goodison', text: 'The foil setup felt good but I noticed some instability on the gybe at mark 2. We should look at the cant angle data from that transition.' },
      { speaker: 'Giles Scott', text: 'The boat was very reactive in those 12-knot puffs. I think we were overcorrecting on the rudder through the transition zone.' },
    ],
  },
  {
    id: 'perth-r2-gbr',
    source: 'race',
    regatta: 'Perth',
    race: 'R2',
    team: 'GBR',
    title: 'Post-Race Debrief',
    duration: '14:05',
    lines: [
      { speaker: 'Ben Ainslie', text: 'Much better race. We finally got the start sequence working — the two-word call protocol from the coach made a real difference on timing.' },
      { speaker: 'Luke Patience', text: 'The pre-start manoeuvre on port was the best we have done all season. Clean bow forward with 4 seconds to burn.' },
      { speaker: 'Paul Goodison', text: 'I want to flag the offset gybe. We lost the hold on the foil at the bottom mark. That is a pattern from testing — we need a protocol for low-wind gybe entries.' },
    ],
  },
  {
    id: 'perth-r1-aus',
    source: 'race',
    regatta: 'Perth',
    race: 'R1',
    team: 'AUS',
    title: 'Post-Race Debrief',
    duration: '22:10',
    lines: [
      { speaker: 'Tom Slingsby', text: 'Good race overall. We capitalised on the pressure shift on the left side that most other teams missed. That was the race won right there.' },
      { speaker: 'Jason Waterhouse', text: 'The wing trimming in the 8-to-12 transition was really consistent today. We have definitely improved there since Auckland testing.' },
      { speaker: 'Tom Slingsby', text: 'The one area I am not happy with is our start. We were a boat length late on the gun. We keep giving away that free distance at the line.' },
      { speaker: 'Kyle Langford', text: 'There was a timing miscommunication between helm and strategist on the final approach. We need a clearer decision point — call it at 20 seconds, not 12.' },
    ],
  },
  {
    id: 'auckland-r1-nzl',
    source: 'race',
    regatta: 'Auckland',
    race: 'R1',
    team: 'NZL',
    title: 'Post-Race Debrief',
    duration: '25:34',
    lines: [
      { speaker: 'Peter Burling', text: 'Home crowd today and we delivered. The key was holding our lane on the first beat — did not panic when France split away to the right.' },
      { speaker: 'Blair Tuke', text: 'The boat speed felt great in those 15-knot conditions. The new wing setting we trialled in warm-up translated directly into upwind VMG.' },
      { speaker: 'Peter Burling', text: 'One thing to note — we got lucky at the offset. If Great Britain had not touched the mark we would have had a very different second half.' },
      { speaker: 'Louis Sinclair', text: 'The grinder load management was cleaner than Perth. We were consistent all the way through without the spikes we saw on the foil transitions.' },
    ],
  },
  {
    id: 'auckland-r2-nzl',
    source: 'race',
    regatta: 'Auckland',
    race: 'R2',
    team: 'NZL',
    title: 'Post-Race Debrief',
    duration: '19:48',
    lines: [
      { speaker: 'Peter Burling', text: 'Race 2 was harder. The wind dropped into the 8-knot range and we struggled to keep the boat flying through the lulls on the second beat.' },
      { speaker: 'Blair Tuke', text: 'We lost two positions at the top mark because we were late onto the foil coming out of the tack. That is a setup question — the takeoff angle needs review.' },
      { speaker: 'Peter Burling', text: 'Australia read the right side of the course better than us today. We need to look at how their strategist is calling the pressure bands.' },
    ],
  },
  {
    id: 'auckland-r1-fra',
    source: 'race',
    regatta: 'Auckland',
    race: 'R1',
    team: 'FRA',
    title: 'Post-Race Debrief',
    duration: '16:22',
    lines: [
      { speaker: 'Quentin Delapierre', text: 'We made one critical error today — the tack decision at mark 2 was too late. We lost 18 metres in that moment and never recovered it.' },
      { speaker: 'Florian Trittel', text: 'The trigger was unclear between helm and flight controller. We had two calls at the same time — we need a single decision owner for that mark.' },
      { speaker: 'Quentin Delapierre', text: 'Boat speed on the run was excellent. Best downwind number we have posted all season. The gybe angles are really dialled in now.' },
    ],
  },
  {
    id: 'sydney-r1-usa',
    source: 'race',
    regatta: 'Sydney',
    race: 'R1',
    team: 'USA',
    title: 'Post-Race Debrief',
    duration: '20:15',
    lines: [
      { speaker: 'Jimmy Spithill', text: 'Sydney conditions were tricky — shifty offshore breeze with a lot of pressure variance on the left side. We played it too conservatively.' },
      { speaker: 'Rome Kirby', text: 'The boat handling was clean though. Zero touchdowns, clean gybes at both marks. From an execution standpoint this was one of our best races.' },
      { speaker: 'Jimmy Spithill', text: 'We need to be braver on the tactical calls. Sitting in the middle of the fleet in those conditions is not a strategy — it is just delay.' },
      { speaker: 'Tom Johnson', text: 'The start line setup was better than Auckland. We identified the bias correctly but chose the wrong end anyway. That decision needs to be cleaner.' },
    ],
  },
  {
    id: 'rio-r1-bra',
    source: 'race',
    regatta: 'Rio',
    race: 'R1',
    team: 'BRA',
    title: 'Post-Race Debrief',
    duration: '23:07',
    lines: [
      { speaker: 'Martine Grael', text: 'Home race, big crowd, and we delivered a podium. The team was very calm before the start which made a real difference to our execution.' },
      { speaker: 'Kahena', text: 'The wind was exactly as forecast — steady 14 knots from the south. We had the right setup from warm-up and never had to change anything mid-race.' },
      { speaker: 'Martine Grael', text: 'The first upwind leg was where we built our lead. The left side paid all day and we committed to it early and held our position.' },
    ],
  },
  {
    id: 'rio-r2-bra',
    source: 'race',
    regatta: 'Rio',
    race: 'R2',
    team: 'BRA',
    title: 'Post-Race Debrief',
    duration: '17:50',
    lines: [
      { speaker: 'Martine Grael', text: 'Race 2 was more difficult. The sea state built during the race and the foil management became critical in those choppy conditions.' },
      { speaker: 'Kahena', text: 'We had three foil touchdowns in the final run — that is unusual for us. The wave frequency was very unpredictable in the final section of the course.' },
      { speaker: 'Martine Grael', text: 'Despite that, we held second place. The boat speed was still competitive. We need to work on the rough-water height management before Bermuda.' },
    ],
  },
  {
    id: 'rio-r1-sui',
    source: 'race',
    regatta: 'Rio',
    race: 'R1',
    team: 'SUI',
    title: 'Post-Race Debrief',
    duration: '21:33',
    lines: [
      { speaker: 'Sebastien Schneiter', text: 'The race started well but we got caught in a bad position at the offset and had to do a penalty turn. That put us 5 boats back from where we should have been.' },
      { speaker: 'Arnaud Psarofaghis', text: 'The penalty was marginal — we were in the zone but the overlap was really close. We need to review the video to understand our protocol there.' },
      { speaker: 'Sebastien Schneiter', text: 'After the penalty the recovery was strong. We passed three boats on the second upwind which shows the boat speed is there.' },
    ],
  },
];
