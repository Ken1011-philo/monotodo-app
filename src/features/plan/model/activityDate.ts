// 「今日」をどう決めるか（活動日）の純粋関数。
// 仕様: docs/specs/recurring-task-completion.md

/** 1 日の区切り時刻（時）。0 なら深夜 0 時で日付が変わる。将来はユーザー設定にする想定 */
export const DAY_START_HOUR = 0;

/** 活動日の文字列（ローカル日付 YYYY-MM-DD） */
export type ActivityDate = string;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 日時が属する活動日を返す。ブラウザのローカル時刻（＝ユーザーのタイムゾーン）で判定し、
 * 区切り時刻より前は前日扱いにする（例: 区切り 4 時なら 3:59 は前日）
 */
export function toActivityDate(
  date: Date,
  dayStartHour: number = DAY_START_HOUR
): ActivityDate {
  const shifted = new Date(date.getTime());
  shifted.setHours(shifted.getHours() - dayStartHour);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

/** 次に活動日が切り替わるまでのミリ秒 */
export function msUntilNextActivityDate(
  now: Date,
  dayStartHour: number = DAY_START_HOUR
): number {
  const next = new Date(now.getTime());
  next.setHours(dayStartHour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}
