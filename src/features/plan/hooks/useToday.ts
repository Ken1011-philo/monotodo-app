import { useEffect, useState } from "react";

import {
  msUntilNextActivityDate,
  toActivityDate,
  type ActivityDate,
} from "../model/activityDate";

/**
 * 今日の活動日を返し、日付が変わったら更新する。
 * 区切り時刻にタイマーで更新するほか、スリープ復帰やタブを戻したとき（focus / visibilitychange）にも
 * 判定し直す（スリープ中はタイマーが遅れるため）。
 */
export function useToday(): ActivityDate {
  const [today, setToday] = useState(() => toActivityDate(new Date()));

  useEffect(() => {
    let timer: number | undefined;
    const sync = () => setToday(toActivityDate(new Date()));
    const schedule = () => {
      timer = window.setTimeout(() => {
        sync();
        schedule();
      }, msUntilNextActivityDate(new Date()));
    };
    const syncIfVisible = () => {
      if (document.visibilityState === "visible") sync();
    };

    schedule();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", syncIfVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", syncIfVisible);
    };
  }, []);

  return today;
}
