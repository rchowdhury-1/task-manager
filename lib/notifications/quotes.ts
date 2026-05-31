export interface Quote {
  text: string;
  author: string | null;
}

export const HABIT_QUOTES: Quote[] = [
  { text: "Some people spend their entire lives waiting for the time to be right to make an improvement.", author: "James Clear" },
  { text: "First we make our habits, then our habits make us.", author: null },
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi" },
  { text: "The best of deeds is that which is done with consistency, even if small.", author: "Prophet Muhammad \uFE0E\uFE0E" },
  { text: "Success doesn't come from what we do occasionally; it comes from what we do consistently.", author: null },
  { text: "Consistency finishes what intensity starts.", author: null },
  { text: "From the time you get up in the morning to the time you go to sleep at night, your habits largely control the words you say, the things you do, and the ways you react and respond.", author: null },
  { text: "The secret of your success is found in your daily routine.", author: "John C. Maxwell" },
  { text: "Every action you take is a vote for the type of person you wish to become.", author: "James Clear" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
  { text: "Allah does not change the condition of a people until they change what is in themselves.", author: "Qur'an 13:11" },
];

/**
 * Deterministic quote selection based on day-of-year and slot.
 * Morning and evening of the same day return different quotes.
 * Cycles through the full pool over time.
 */
export function quoteFor(date: Date, slot: 'morning' | 'evening'): Quote {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  const slotOffset = slot === 'morning' ? 0 : Math.floor(HABIT_QUOTES.length / 2);
  const index = (dayOfYear + slotOffset) % HABIT_QUOTES.length;

  return HABIT_QUOTES[index];
}
