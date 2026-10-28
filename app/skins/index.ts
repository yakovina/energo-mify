// Скіни тесту. Рушій (app/useQuiz.ts) і контент (data/quiz.ts) спільні,
// скін визначає лише вигляд: розмітку екранів і свій CSS.
//
// Як додати скін:
//   1. скопіювати app/skins/pixel → app/skins/<назва>, переписати розмітку і CSS;
//      кореневий клас — .<назва> (див. pixel.css, де все під .pixel);
//   2. зареєструвати його в SKINS нижче й підключити CSS в app/layout.tsx;
//   3. зібрати з NEXT_PUBLIC_SKIN=<назва> npm run build.
import * as pixel from "./pixel";

const SKINS = { pixel } as const;

export type SkinName = keyof typeof SKINS;

const wanted = (process.env.NEXT_PUBLIC_SKIN ?? "pixel") as SkinName;

export const skinName: SkinName = wanted in SKINS ? wanted : "pixel";
export const { Skin, ResultPage, NotFound } = SKINS[skinName];
