"use client";

import { Skin } from "./skins";
import { useQuiz } from "./useQuiz";

export default function Quiz() {
  const quiz = useQuiz();
  return <Skin quiz={quiz} />;
}
