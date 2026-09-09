import { addDays, todayISO } from "./utils";

// A compact SM-2-style spaced repetition scheduler.
// Ratings: "again" | "hard" | "good" | "easy"

export type Rating = "again" | "hard" | "good" | "easy";

export interface SrsState {
  ease: number; // ease factor, min 1.3
  interval: number; // days until next review
  reps: number; // successful reps in a row
  due: string; // ISO date
  lastReviewed: string | null;
}

export function newSrsState(): SrsState {
  return {
    ease: 2.5,
    interval: 0,
    reps: 0,
    due: todayISO(),
    lastReviewed: null,
  };
}

export function schedule(state: SrsState, rating: Rating): SrsState {
  let { ease, interval, reps } = state;

  if (rating === "again") {
    reps = 0;
    interval = 0; // review again today (treated as <1 day)
    ease = Math.max(1.3, ease - 0.2);
    return {
      ease,
      interval,
      reps,
      due: todayISO(),
      lastReviewed: todayISO(),
    };
  }

  // successful recall
  reps += 1;
  if (rating === "hard") {
    ease = Math.max(1.3, ease - 0.15);
    interval = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
  } else if (rating === "good") {
    interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(interval * ease);
  } else {
    // easy
    ease = ease + 0.15;
    interval = reps === 1 ? 3 : Math.round(interval * ease * 1.3);
  }
  interval = Math.max(1, interval);

  return {
    ease,
    interval,
    reps,
    due: addDays(todayISO(), interval),
    lastReviewed: todayISO(),
  };
}

export function isDue(state: SrsState): boolean {
  return state.due <= todayISO();
}

export function nextIntervalLabel(state: SrsState, rating: Rating): string {
  const next = schedule(state, rating);
  if (rating === "again") return "<10m";
  if (next.interval <= 1) return "1d";
  if (next.interval < 30) return `${next.interval}d`;
  const months = Math.round(next.interval / 30);
  return `${months}mo`;
}
