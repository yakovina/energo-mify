// Статистика проходжень — як у попередніх тестах Хмарочоса: тест шле дані
// прямо в Google Form (formResponse), форма пише їх у Google-таблицю, а аркуш
// «stats» рахує зведення. Форму й таблицю зі зведенням створюємо окремо. Порожній FORM — нічого не надсилаємо.
//
// Два записи на проходження: «start» (натиснули «Почати тест») і «finish»
// (дійшли до результату: бали, рівень, відповідь на кожне твердження: П або Н).
// З localhost нічого не шлемо, щоб розробка не псувала цифри; з ?test в адресі
// запис позначається host=test, і зведення його не рахує.

// Форма «Міфи про енергетику — статистика» (створена docs/stats-setup.gs 03.11.2026),
// пише в таблицю https://docs.google.com/spreadsheets/d/1aVn3tzbI7LuGtY2-udyNOYW5LxVmlVkjX-qO8Q38ud0
export const FORM: { action: string; entries: Record<string, string> } = {
  action: "https://docs.google.com/forms/d/e/1FAIpQLSdivhSshfPjtI7IWHlzbxRVB01HzHj8_X332ExUNKLc1R0T-A/formResponse",
  entries: {
    run_id: "entry.1242403678",
    event: "entry.517765289",
    score: "entry.214458380",
    level: "entry.1976936867",
    q1: "entry.1257931991",
    q2: "entry.1150748755",
    q3: "entry.1178882524",
    q4: "entry.64310488",
    q5: "entry.2078752587",
    q6: "entry.1331393339",
    q7: "entry.1002462192",
    q8: "entry.556484324",
    host: "entry.1918808699",
  },
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
