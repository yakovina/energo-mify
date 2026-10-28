"use client";

// Спільне для скінів: клавіатура, плавна прокрутка, вібрація.

import { useEffect, useRef } from "react";
import type { QuizApi } from "../useQuiz";

/** Плавна прокрутка власним кроком: не залежить від scroll-behavior браузера. */
export function glide(to: number, ms: number) {
  const from = window.scrollY;
  const dist = to - from;
  if (Math.abs(dist) < 2) return;
  const t0 = performance.now();
  let expected = from;
  const step = (now: number) => {
    // хтось інший прокрутив сторінку (новий екран, користувач) — зупиняємось
    if (Math.abs(window.scrollY - expected) > 3) return;
    const p = Math.min(1, (now - t0) / ms);
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    expected = Math.round(from + dist * e);
    window.scrollTo(0, expected);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Клавіші: 1 / п — «Правда», 2 / н — «Неправда», Enter — далі. */
export function useKeys(quiz: QuizApi) {
  const ref = useRef(quiz);
  useEffect(() => {
    ref.current = quiz;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const z = ref.current;
      const k = e.key.toLowerCase();
      if (z.screen === "question") {
        const v = k === "1" || k === "п" ? true : k === "2" || k === "н" ? false : null;
        if (v !== null) {
          e.preventDefault();
          buzz(v === z.q.correct ? 18 : [28, 45, 28]);
          z.answer(v);
        }
      } else if (z.screen === "reveal" && e.key === "Enter" && t?.tagName !== "BUTTON" && t?.tagName !== "A") {
        e.preventDefault();
        z.next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** Вібрація (Android). На iPhone сайтам недоступна — тихо пропускаємо. */
export function buzz(pattern: number | number[]) {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}
