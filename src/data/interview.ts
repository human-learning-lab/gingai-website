/**
 * The Sailor Context File interview.
 *
 * One question per section of the context file, in the order the file is
 * written. That is the whole design: the profile has eleven content sections
 * under its two layers, so eleven questions, each aimed at exactly one of them.
 * An answer that lands has somewhere to go; a section with no question behind
 * it comes back as "No material available in current inputs".
 *
 * Ras Kostner's interview ran ten questions, and his own appendix noted that
 * question 3 bundled two things — how he processes a bad moment, and how he
 * reacts to his own errors — and needed a follow-up to get the second half.
 * "Worth splitting into two separate questions for the next sailor." It is
 * split here, which is where the eleventh comes from.
 *
 * Wording follows the same register as that interview: conversational, second
 * person, concrete, and willing to ask for the thing the sailor would not
 * volunteer.
 */

export interface InterviewQuestion {
  /** The context-file heading this answer is meant to fill. */
  section: string;
  text: string;
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    section: 'Background & Experience',
    text: 'Walk me through your sailing journey — the campaigns and classes that got you to where you are now. What are the one or two moments in that arc that most shaped how you think about performance today?',
  },
  {
    section: 'Role & Technical Ownership',
    text: 'Your role shifts with crew size. What do you actually own in each version of it — and what is the thread that connects them, the thing that makes you good at one that also makes you good at the other?',
  },
  {
    section: 'Processing Style',
    text: 'When you replay a bad moment on the water afterward, do you see it, feel it, or hear it — the comms, the sound of the boat? And in the moment, how much of the wider race are you actually taking in?',
  },
  {
    section: 'Reaction Under Pressure',
    text: 'When you make an error mid-race, what is your default — do you go quiet, talk more, try to fix it instantly, or dwell on it afterward? And when you look back at your mistakes, what do they usually trace back to?',
  },
  {
    section: 'Conditions That Raise Internal Pressure',
    text: 'What conditions quietly get under your skin — not the ones you would openly complain about, but the ones where you notice yourself gripping a little tighter, even if you would not say so out loud?',
  },
  {
    section: 'What Drives Them',
    text: 'Strip away the result for a moment — what actually makes you walk off the boat feeling like it was a genuinely good day? And separately: what are you chasing this cycle — the podium, mastering the role, proving something to yourself, the team’s story, something else?',
  },
  {
    section: 'Current Development Areas',
    text: 'What is the one thing about your role right now that is not automatic yet — the thing you are consciously still working on?',
  },
  {
    section: 'What Good Days Look Like Right Now',
    text: 'Think of a recent session where that thing went well, close to right. What was different about that day compared to the days it does not click?',
  },
  {
    section: 'Recurring Mistakes Not Yet Resolved',
    text: 'Is there a mistake that has shown up more than once in the last few weeks that has not fully turned into a lesson yet? Something you know you are still repeating — and what do you think is actually behind it?',
  },
  {
    section: 'Upcoming Context Sensitivity',
    text: 'Looking ahead to the next event or training block — is there a wind range, gear configuration, or crew setup coming up that you are personally uncertain about right now?',
  },
  {
    section: 'What Works / Doesn’t Work in Priming',
    text: 'Has anyone — a coach or otherwise — ever asked you a question before a session that got something real out of you? What made it work? And is there a type of question that just makes you shut down or give a throwaway answer?',
  },
];

export const INTERVIEW_QUESTION_TEXTS = INTERVIEW_QUESTIONS.map(q => q.text);

/**
 * Interviews are not race days, but everything downstream — the question-set
 * mirror, the Storage paths for answers and audio, the response page — keys on
 * a run id of this shape. One fixed run keeps every sailor's interview in one
 * place: team/responses/InterviewRaceday1Season6/interview/{sailor}/.
 */
export const INTERVIEW_RUN_ID = 'InterviewRaceday1Season6';

export const INTERVIEW_KIND = 'interview';

/** The sailor whose file is the worked example, shown beside the questions. */
export const INTERVIEW_REFERENCE_SAILOR = 'Rasmus';

export const INTERVIEW_DISTIL_PROMPT =
  'Condense each interview answer to one line that keeps the specifics — the ' +
  'numbers, the gear, the exact phrasing they used about themselves. These feed ' +
  'a standing profile, so a line that loses the detail is worse than no line.';

export const INTERVIEW_PROFILE_PROMPT =
  'Build this sailor’s Sailor Context File from their interview answers alone. ' +
  'Every section of the structure has one question behind it, in order. Where an ' +
  'answer is thin, say so in that section rather than inventing around it.';
