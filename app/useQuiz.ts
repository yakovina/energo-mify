"use client";

import { useRef, useState } from "react";
import { type Level, type Question, type Verdict, getLevel, questions } from "../data/quiz";
import { sendStats, trackStart, type AnswerStat } from "./stats";

export type Screen = "intro" | "question" | "reveal" | "result";

/** Що скін отримує від рушія. Скін нічого не рахує сам — лише показує. */
export interface QuizApi {
  screen: Screen;
  /** Поточне питання (на екранах question/reveal). */
  q: Question;
  /** Індекс поточного твердження, 0..7. */
  idx: number;
  total: number;
  /** Обрана відповідь на поточне питання (на reveal). */
  picked: Verdict | null;
  /** Результат кожного вже пройденого питання: true — влучно. */
  history: boolean[];
  score: number;
  level: Level;
  isLast: boolean;
  start: () => void;
  answer: (v: Verdict) => void;
  next: () => void;
  restart: () => void;
}

// Подвійний rAF: чекаємо, поки новий екран відрендериться, інакше скрол
// спрацює по старій розкладці.
/** Куди ставити екран після переходу. Скін може позначити блок атрибутом
 *  data-scroll-anchor="<media query>" — тоді, якщо умова виконується, екран
 *  починається з цього блоку (з урахуванням його scroll-margin-top), інакше — згори. */
export function scrollToStart() {
  const a = document.querySelector<HTMLElement>("[data-scroll-anchor]");
  const mq = a?.dataset.scrollAnchor;
  if (a && (!mq || window.matchMedia(mq).matches)) {
    const off = parseFloat(getComputedStyle(a).scrollMarginTop) || 0;
    // offsetTop не враховує transform — анімація появи блоку не зсуває ціль
    let top = 0;
    for (let el: HTMLElement | null = a; el; el = el.offsetParent as HTMLElement | null) top += el.offsetTop;
    window.scrollTo({ top: Math.max(0, top - off), behavior: "auto" });
  } else {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

const toTop = () => requestAnimationFrame(() => requestAnimationFrame(scrollToStart));

export function useQuiz(): QuizApi {
  const [screen, setScreen] = useState<Screen>("intro");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Verdict | null>(null);
  const [history, setHistory] = useState<boolean[]>([]);
  const answersRef = useRef<AnswerStat[]>([]);

  const total = questions.length;
  const q = questions[idx];
  const score = history.filter(Boolean).length;

  const start = () => {
    trackStart();
    answersRef.current = [];
    setHistory([]);
    setIdx(0);
    setPicked(null);
    setScreen("question");
    toTop();
  };

  const answer = (v: Verdict) => {
    if (screen !== "question") return;
    const ok = v === q.correct;
    setPicked(v);
    setHistory((h) => [...h, ok]);
    answersRef.current.push({ id: q.id, picked: v ? "П" : "Н", ok });
    setScreen("reveal");
  };

  const next = () => {
    if (idx + 1 < total) {
      setIdx((i) => i + 1);
      setPicked(null);
      setScreen("question");
    } else {
      const finalScore = answersRef.current.filter((a) => a.ok).length;
      sendStats({ score: finalScore, level: getLevel(finalScore).title, answers: answersRef.current });
      setScreen("result");
    }
    toTop();
  };

  const restart = () => {
    setScreen("intro");
    setHistory([]);
    setIdx(0);
    setPicked(null);
    toTop();
  };

  return {
    screen,
    q,
    idx,
    total,
    picked,
    history,
    score,
    level: getLevel(score),
    isLast: idx + 1 >= total,
    start,
    answer,
    next,
    restart,
  };
}
