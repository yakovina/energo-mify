// Статистика проходжень — як у попередніх тестах Хмарочоса: тест шле дані
// прямо в Google Form (formResponse), форма пише їх у Google-таблицю, а аркуш
// «stats» рахує зведення. Форму й таблицю зі зведенням створюємо окремо. Порожній FORM — нічого не надсилаємо.
//
// Два записи на проходження: «start» (натиснули «Почати тест») і «finish»
// (дійшли до результату: бали, рівень, відповідь на кожне твердження: П або Н).
// З localhost нічого не шлемо, щоб розробка не псувала цифри; з ?test в адресі
// запис позначається host=test, і зведення його не рахує.

// Порожній FORM — статистика вимкнена. Щоб увімкнути, потрібна Google Form з полями
// FIELDS нижче (як у «Коді міста»): action — її formResponse, entries — id полів.
export const FORM: { action: string; entries: Record<string, string> } = {
  action: "",
  entries: {},
};

export interface AnswerStat {
  id: number;
  picked: string;
  ok: boolean;
}

export interface ResultStat {
  score: number;
  level: string;
  answers: AnswerStat[];
}

const FIELDS = ["run_id", "event", "score", "level", "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "host"];

const formReady = () => FORM.action !== "" && FIELDS.every((f) => (FORM.entries[f] ?? "") !== "");

const isLocal = () => {
  const h = typeof location !== "undefined" ? location.hostname : "";
  return h === "" || h === "localhost" || h === "127.0.0.1" || h.endsWith(".local");
};

let runId = "";
const newRunId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function post(fields: Record<string, string>) {
  if (!formReady() || isLocal() || typeof fetch === "undefined") return;
  try {
    const body = new URLSearchParams();
    // ?test в адресі — перевірочне проходження: host=test, у зведення не потрапляє
    const host = new URLSearchParams(location.search).has("test") ? "test" : location.hostname;
    const all: Record<string, string> = { ...fields, run_id: runId, host };
    for (const [k, v] of Object.entries(all)) if (FORM.entries[k]) body.set(FORM.entries[k], v);
    fetch(FORM.action, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }).catch(() => {});
  } catch {
    /* статистика не має ламати тест */
  }
}

/** Людина натиснула «Почати тест» (і «Пройти ще раз» — це нове проходження). */
export function trackStart(): void {
  runId = newRunId();
  post({ event: "start" });
}

/** Людина дійшла до результату. */
export function sendStats(payload: ResultStat): void {
  if (!runId) runId = newRunId();
  const fields: Record<string, string> = { event: "finish", score: String(payload.score), level: payload.level };
  for (const a of payload.answers) fields[`q${a.id}`] = a.picked;
  post(fields);
}
