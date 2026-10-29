"use client";

// Скін «Піксель»: тест у мові піксельної ілюстрації. Бузкове небо з ледь
// помітною піксельною сіткою, панелі зі «сходинковими» кутами й жорсткою
// тінню, пагорби ілюстраторки внизу сторінки. Прогрес — батарейка на вісім
// поділок: правильна відповідь заряджає поділку жовтим, хибна — іржавим.
// Після відповіді: влучно — у кутку картки світить лампочка, мимо — свічка.
// Рух — «аркадний»: картка падає й пружинить, кнопка сплющується під пальцем (без паузи),
// влучно — іскри-пікселі й «+1», мимо — кнопка «вимикається», картка струшується.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { scrollToStart, type QuizApi } from "../../useQuiz";
import { COVER_ALT, VERDICT_LABEL, intro, TOTAL, type Level, type Question, type Verdict } from "../../../data/quiz";
import { asset } from "../../bp";
import { SITE_URL, TEST_SHARE_TEXT, resultShareUrl } from "../../share";
import { buzz, glide, useKeys } from "../common";
import { FB, TG } from "./icons";

/** Підписи інтерфейсу (не контент тесту) — усі в одному місці. */
const UI = {
  start: "Почати тест",
  next: "Наступне твердження",
  finish: "Мій результат",
  right: "Так і є!",
  wrong: "Насправді ні",
  sources: "Джерела:",
  again: "Пройти ще раз",
  take: "Пройти тест",
  shareTest: "Поділитися тестом",
  shareResult: "Поділитися результатом",
  copy: "Копіювати",
  copied: "Скопійовано",
  other: "Інше…",
  site: "hmarochos.kiev.ua",
  qOf: (n: number, t: number) => `Твердження ${n} з ${t}`,
  yourResult: "Ваш результат",
  sharedResult: "Результат тесту",
  of: (t: number) => `з ${t}`,
  nf: "Тут світла немає — сторінку не знайдено",
  home: "На початок",
};

const Arrow = () => (
  <svg className="arrow" viewBox="0 0 9 8" width="18" height="16" shapeRendering="crispEdges" aria-hidden>
    <path d="M5 0h1v1H5zM5 1h2v1H5zM5 2h3v1H5zM0 3h9v2H0zM5 5h3v1H5zM5 6h2v1H5zM5 7h1v1H5z" fill="currentColor" />
  </svg>
);

/** Піксельні ✓ і ✕ — у сітці 7×7, як у ілюстрації. */
const Check = () => (
  <svg viewBox="0 0 7 7" width="18" height="18" shapeRendering="crispEdges" aria-hidden>
    <path d="M5 1h2v1H5zM4 2h2v1H4zM3 3h2v1H3zM2 4h2v1H2zM0 3h1v1H0zM1 4h1v1H1zM1 5h2v1H1z" fill="currentColor" />
  </svg>
);
const Cross = () => (
  <svg viewBox="0 0 7 7" width="16" height="16" shapeRendering="crispEdges" aria-hidden>
    <path d="M0 0h2v1H0zM5 0h2v1H5zM1 1h2v1H1zM4 1h2v1H4zM2 2h3v1H2zM3 3h1v1H3zM2 4h3v1H2zM1 5h2v1H1zM4 5h2v1H4zM0 6h2v1H0zM5 6h2v1H5z" fill="currentColor" />
  </svg>
);

/** Сонце й хмари з обкладинки, намальовані тими самими «пікселями». */
const SUN = [
  "...xxx...",
  ".xxxxxxx.",
  ".xxoooxx.",
  "xxoooooxx",
  "xxoooooxx",
  "xxoooooxx",
  ".xxoooxx.",
  ".xxxxxxx.",
  "...xxx...",
];
function Sun({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="-3 -3 15 15" shapeRendering="crispEdges" aria-hidden>
      {SUN.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={c === "o" ? "#f8e840" : "#fcc63d"} />,
        ),
      )}
      {[
        [-2, -2],
        [10, -2],
        [-3, 5],
        [11, 4],
        [-1, 11],
        [10, 11],
        [4, -3],
      ].map(([x, y]) => (
        <rect key={`r${x}${y}`} className="ray" x={x} y={y} width="1" height="1" fill="#f8e840" />
      ))}
    </svg>
  );
}

const CLOUD = [
  ".......xxxx.........",
  "..xxxxxxxxxxxx......",
  ".xxxxxxxxxxxxxxxxx..",
  "xxxxxxxxxxxxxxxxxxxx",
  "..xxxxxxxxxxxxxxxx..",
  "....yyyyyyy..yyyy...",
];
function Cloud({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="0 0 20 6" shapeRendering="crispEdges" aria-hidden>
      {CLOUD.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={c === "y" ? "#f8e840" : "#aab3dd"} />,
        ),
      )}
    </svg>
  );
}

function Sky() {
  return (
    <div className="sky" aria-hidden>
      <Sun cls="sun" />
      <Cloud cls="cloud c1" />
      <Cloud cls="cloud c2" />
    </div>
  );
}

/** Пагорби ілюстраторки — смуга на всю ширину внизу сторінки. Нічні — для «заручника». */
function Hills({ night }: { night?: boolean }) {
  return <div className={`hills${night ? " night" : ""}`} aria-hidden />;
}

function SiteLink() {
  return (
    <a className="siteLink" href="https://hmarochos.kiev.ua/" target="_blank" rel="noopener noreferrer">
      {UI.site}
      <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 2.5h5.5V8M9.5 2.5 2.5 9.5" />
      </svg>
    </a>
  );
}

function Bar({ right }: { right: React.ReactNode }) {
  return (
    <header className="bar">
      <div className="brandRow">
        <a className="brand" href="https://hmarochos.kiev.ua/" target="_blank" rel="noopener noreferrer" aria-label="Хмарочос — відкрити сайт">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/hmarochos_logo_new.svg")} alt="Хмарочос" width={87} height={32} />
        </a>
        <span className="brandSub">{intro.short}</span>
      </div>
      {right}
    </header>
  );
}

/** Батарейка на 8 поділок. history — результати пройдених тверджень; now — індекс поточного. */
/** Хрестик у хибній поділці: колір не єдина ознака. */
const CellCross = () => (
  <svg viewBox="0 0 4 4" shapeRendering="crispEdges" aria-hidden>
    <path d="M0 0h1v1H0zM3 0h1v1H3zM1 1h2v2H1zM0 3h1v1H0zM3 3h1v1H3z" fill="#f7f8fd" />
  </svg>
);

function Battery({ history, now, big, pop }: { history: boolean[]; now?: number; big?: boolean; pop?: boolean }) {
  return (
    <div
      className={`battery${big ? " big" : ""}`}
      role="img"
      aria-label={`Пройдено ${history.length} з ${TOTAL}, влучно ${history.filter(Boolean).length}`}
    >
      <div className="cells">
        {Array.from({ length: TOTAL }, (_, i) => {
          const st = i < history.length ? (history[i] ? "ok" : "miss") : i === now ? "now" : "";
          // щойно заряджена поділка «підстрибує»
          const p = pop && i === history.length - 1 ? " pop" : "";
          return (
            <span key={i} className={`cell ${st}${p}`} style={big ? { animationDelay: `${150 + i * 90}ms` } : undefined}>
              {st === "miss" && <CellCross />}
            </span>
          );
        })}
      </div>
      <span className="nub" />
    </div>
  );
}

function Share({ url, text, label }: { url: string; text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(!!navigator.share && window.matchMedia("(pointer: coarse)").matches);
  }, []);
  const popup = (u: string) => {
    buzz(8);
    window.open(u, "_blank", "noopener,noreferrer,width=620,height=560");
  };
  const copy = async () => {
    buzz(8);
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  const more = async () => {
    buzz(8);
    try {
      await navigator.share({ text, url });
    } catch {
      /* скасовано */
    }
  };
  return (
    <div className="share">
      <p className="shareLabel">{label}</p>
      <div className={`shareGrid${native ? " four" : ""}`}>
        <button type="button" className="fr sbtn fb" onClick={() => popup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d={FB} fill="currentColor" />
          </svg>
          <span>Facebook</span>
        </button>
        <button type="button" className="fr sbtn tg" onClick={() => popup(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`)}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d={TG} fill="currentColor" />
          </svg>
          <span>Telegram</span>
        </button>
        <button type="button" className={`fr sbtn copy${copied ? " isCopied" : ""}`} onClick={copy}>
          {copied ? (
            <Check />
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
            </svg>
          )}
          <span>{copied ? UI.copied : UI.copy}</span>
        </button>
        {native && (
          <button type="button" className="fr sbtn more" onClick={more}>
            <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M7 8l5-5 5 5M5 14v7h14v-7" />
            </svg>
            <span>{UI.other}</span>
          </button>
        )}
      </div>
    </div>
  );
}

const preloaded = new Set<string>();
function preload(src: string) {
  if (preloaded.has(src)) return;
  preloaded.add(src);
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  // розпаковуємо наперед: інакше телефон декодує лампочку саме в момент відповіді
  img.decode?.().catch(() => {});
}

// ——— твердження ———

function Sources({ q }: { q: Question }) {
  return (
    <p className="sources">
      {UI.sources}{" "}
      {q.sources.map((s, i) => (
        <span key={s.url + i}>
          {i > 0 && " · "}
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            {s.label}
          </a>
        </span>
      ))}
    </p>
  );
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Іскри-пікселі й «+1» з центру кнопки — як у аркаді за влучання. */
function burst(btn: HTMLElement) {
  if (reducedMotion()) return;
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const colors = ["#f8e840", "#fcc63d", "#cc8619", "#ffffff"];
  const n = 10;
  for (let k = 0; k < n; k++) {
    const p = document.createElement("span");
    p.className = "pxSpark";
    p.style.background = colors[k % colors.length];
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    document.body.append(p);
    const a = (Math.PI * 2 * k) / n + Math.random() * 0.4;
    const d = 28 + Math.random() * 30;
    p.animate(
      [
        { transform: "translate(-50%, -50%)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d - 10}px))`, opacity: 0 },
      ],
      { duration: 480 + Math.random() * 160, easing: "cubic-bezier(.2,.8,.2,1)" },
    ).onfinish = () => p.remove();
  }
  const plus = document.createElement("span");
  plus.className = "pxPlus";
  plus.textContent = "+1";
  plus.style.left = `${cx}px`;
  plus.style.top = `${r.top - 6}px`;
  document.body.append(plus);
  plus.animate(
    [
      { transform: "translate(-50%, 0)", opacity: 0 },
      { transform: "translate(-50%, -10px)", opacity: 1, offset: 0.25 },
      { transform: "translate(-50%, -28px)", opacity: 0 },
    ],
    { duration: 800, easing: "ease-out" },
  ).onfinish = () => plus.remove();
}

function Choice({ v, q, picked, answered, onPick }: { v: Verdict; q: Question; picked: Verdict | null; answered: boolean; onPick: (v: Verdict, btn: HTMLElement) => void }) {
  const state = !answered ? "" : v === q.correct ? " isRight" : v === picked ? " isWrong" : "";
  return (
    <button
      className={`fr choice ${v ? "yes" : "no"}${state}${answered && v === picked ? " isPicked" : ""}`}
      // aria-disabled замість disabled: кнопка лишається у фокусі й озвучує свій стан
      aria-disabled={answered || undefined}
      data-verdict={String(v)}
      onClick={(e) => {
        if (!answered) onPick(v, e.currentTarget);
      }}
      aria-keyshortcuts={v ? "1" : "2"}
    >
      <span className="t">{VERDICT_LABEL(v)}</span>
      {state === " isRight" && (
        <span className="mark" aria-label="правильна відповідь">
          <Check />
        </span>
      )}
      {state === " isWrong" && (
        <span className="mark" aria-label="ваша відповідь, хибна">
          <Cross />
        </span>
      )}
    </button>
  );
}

function Sheet({ quiz }: { quiz: QuizApi }) {
  const { screen, q, idx, total, picked, history } = quiz;
  const answered = screen === "reveal";
  const ok = picked === q.correct;
  const stRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const lock = useRef(false);

  // реакція миттєва: сплющення кнопки — на :active у CSS, далі відскок правильної
  const pick = (v: Verdict, btn: HTMLElement) => {
    if (lock.current || answered) return;
    lock.current = true;
    const hit = v === q.correct;
    buzz(hit ? 18 : [28, 45, 28]);
    if (hit) burst(btn);
    quiz.answer(v);
  };

  // після відповіді — у тому ж кадрі гортаємо до картки
  useLayoutEffect(() => {
    if (screen === "question") {
      lock.current = false;
      scrollToStart();
      stRef.current?.focus({ preventScroll: true });
      return;
    }
    if (screen !== "reveal" || !cardRef.current) return;
    const el = cardRef.current;
    el.focus({ preventScroll: true });
    // м'яко підтягуємо картку відповіді до ~40 % висоти екрана, але так, щоб кнопки
    // з ✓/✕ лишились у кадрі: видно і що натиснули, і вердикт. Якщо заголовок
    // вердикту й так у верхній частині екрана — не рухаємо сторінку.
    const vh = window.innerHeight;
    const cardTop = el.getBoundingClientRect().top;
    if (cardTop < vh * 0.6) return;
    const choices = document.querySelector<HTMLElement>(".qpane .choices");
    const keep = choices ? choices.getBoundingClientRect().top - 16 : cardTop;
    const by = Math.min(cardTop - vh * 0.4, keep);
    if (by <= 0) return;
    const top = window.scrollY + by;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) window.scrollTo(0, top);
    else glide(top, 450, "out");
  }, [screen, idx]);

  return (
    <main className="pixel sheet">
      <Sky />
      <div className="col">
        <Bar right={<Battery history={history} now={answered ? undefined : idx} pop={answered} />} />

        <div key={q.id} className="qwrap">
          <section className={`panel qpane in${answered && !ok ? " hit" : ""}`} data-scroll-anchor="(max-width: 899px)">
            <p className="qnum">{UI.qOf(idx + 1, total)}</p>
            <p className="statement" ref={stRef} tabIndex={-1}>
              {q.statement}
            </p>
            <div className="choices">
              <Choice v={true} q={q} picked={picked} answered={answered} onPick={pick} />
              <Choice v={false} q={q} picked={picked} answered={answered} onPick={pick} />
            </div>
          </section>

          {answered && (
            <section className={`panel answer in ${ok ? "ok" : "miss"}`} ref={cardRef} tabIndex={-1} aria-live="polite">
              <span className="band" aria-hidden />
              {ok ? (
                <>
                  {/* влучно — лампочка висить на шнурі з нижнього краю картки твердження
                      й звисає в кут картки відповіді; текст її обтікає (hangSpace) */}
                  <span className="hang" aria-hidden>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset("/art/bulb-lamp.webp")} alt="" decoding="async" />
                  </span>
                  <span className="hangSpace" aria-hidden />
                </>
              ) : (
                // мимо — свічка стоїть на куті картки
                // eslint-disable-next-line @next/next/no-img-element
                <img className="corner candle" src={asset("/art/candle.webp")} alt="" decoding="async" />
              )}
              <b className="vtitle">{ok ? UI.right : UI.wrong}</b>
              <p className="expl">{q.explanation}</p>
              <Sources q={q} />
              <button
                className="fr btn primary"
                onClick={() => {
                  buzz(8);
                  quiz.next();
                }}
                aria-keyshortcuts="Enter"
              >
                {quiz.isLast ? UI.finish : UI.next}
                <Arrow />
              </button>
            </section>
          )}
        </div>
      </div>
      <Hills />
    </main>
  );
}

// ——— результат ———

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || to === 0) {
      setN(to);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 700);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
}

function ResultBody({ level, history, onRestart }: { level: Level; history?: boolean[]; onRestart?: () => void }) {
  const score = history?.filter(Boolean).length;
  // на шер-сторінці балу немає — батарейка заряджена до верхньої межі рівня
  const shown = history ? [...history.filter(Boolean), ...history.filter((h) => !h)] : Array.from({ length: TOTAL }, (_, i) => i < level.max);
  return (
    <main className={`pixel result lvl-${level.slug}`}>
      <Sky />
      <div className="col">
        <Bar right={<SiteLink />} />
        <section className="panel resPane in">
          <div className="resTop">
            <div className="resHead">
              <p className="kicker">{history ? UI.yourResult : `${UI.sharedResult} «${intro.title}»`}</p>
              <div className="charge">
                <Battery history={shown} big />
                <p className="score">
                  {score !== undefined ? (
                    <>
                      <b>
                        <CountUp to={score} />
                      </b>{" "}
                      {UI.of(TOTAL)}
                    </>
                  ) : (
                    <b className="range">{level.range}</b>
                  )}
                </p>
              </div>
              <h1 className="ltitle">{level.title}</h1>
            </div>
            {level.slug === "observer" ? (
              // лампочка висить на шнурі з верхньої лінії картки — як у відповідях
              <span className="lvlArt lvlHang">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset("/art/bulb-lamp.webp")} alt="" />
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="lvlArt" src={asset(level.art)} alt="" />
            )}
          </div>
          <p className="ldesc">{level.description}</p>
          {history ? (
            <Share url={resultShareUrl(level.slug)} text={level.shareText} label={UI.shareResult} />
          ) : (
            <Share url={`${SITE_URL}/`} text={TEST_SHARE_TEXT} label={UI.shareTest} />
          )}
          {onRestart ? (
            <button
              className="fr btn ghost"
              onClick={() => {
                buzz(8);
                onRestart();
              }}
            >
              {UI.again}
            </button>
          ) : (
            <a className="fr btn primary" href={asset("/")}>
              {UI.take}
              <Arrow />
            </a>
          )}
        </section>
      </div>
      <Hills night={level.slug === "hostage"} />
    </main>
  );
}

export function ResultPage({ level }: { level: Level }) {
  return <ResultBody level={level} />;
}

export function NotFound() {
  return (
    <main className="pixel result nf">
      <Sky />
      <div className="col">
        <Bar right={<SiteLink />} />
        <section className="panel resPane in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="nfArt" src={asset("/art/candle.webp")} alt="" />
          <h1 className="ltitle">{UI.nf}</h1>
          <a className="fr btn primary" href={asset("/")}>
            {UI.home}
            <Arrow />
          </a>
        </section>
      </div>
      <Hills night />
    </main>
  );
}

// ——— старт ———

export default function PixelSkin({ quiz }: { quiz: QuizApi }) {
  const { screen, level, history } = quiz;
  useKeys(quiz);
  useEffect(() => {
    for (const a of ["bulb-lamp", "candle", "battery", "hills-day", "hills-night"]) preload(asset(`/art/${a}.webp`));
  }, []);

  if (screen === "intro") {
    return (
      <main className="pixel intro">
        <Sky />
        <div className="col">
          <Bar right={<SiteLink />} />
          <section className="panel hero in">
            <figure className="cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset("/art/cover-1000.webp")}
                srcSet={`${asset("/art/cover-1000.webp")} 1000w, ${asset("/art/cover.webp")} 2000w`}
                sizes="(min-width: 900px) 760px, 100vw"
                alt={COVER_ALT}
                width={1000}
                height={667}
                fetchPriority="high"
              />
            </figure>
            <div className="heroText">
              <h1 className="title">{intro.title}</h1>
              <p className="lead">{intro.lead}</p>
              <p className="meta">
                {intro.meta.split(" · ").map((t, i) => (
                  <span key={t}>
                    {i > 0 && <i className="dot" aria-hidden />}
                    {t}
                  </span>
                ))}
              </p>
              <button
                className="fr btn primary"
                onClick={() => {
                  buzz(8);
                  quiz.start();
                }}
              >
                {UI.start}
                <Arrow />
              </button>
              <Share url={`${SITE_URL}/`} text={TEST_SHARE_TEXT} label={UI.shareTest} />
            </div>
          </section>
        </div>
        <Hills />
      </main>
    );
  }

  if (screen === "question" || screen === "reveal") return <Sheet quiz={quiz} />;

  return <ResultBody level={level} history={history} onRestart={quiz.restart} />;
}

