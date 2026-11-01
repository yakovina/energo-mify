"use client";

// Скін «Мережа»: преміальний тест про енергетику в кольорах ілюстрації — бузкове небо,
// синій, жовте світло; великий Lora, тонкі лінії й піксельні деталі на сітці 4 px. Прогрес — лінія мережі з
// восьми підстанцій, по якій біжить імпульс струму: правильна відповідь вмикає
// підстанцію, хибна лишає її іржавою. Арт ілюстраторки — у рідній сітці 120×80,
// збільшений без розмиття й поданий як експонат у тонкій рамці.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { scrollToStart, type QuizApi } from "../../useQuiz";
import { COVER_ALT, VERDICT_LABEL, intro, TOTAL, type Level, type Question, type Verdict } from "../../../data/quiz";
import { asset } from "../../bp";
import { SITE_URL, TEST_SHARE_TEXT, resultShareUrl, scoreShareUrl } from "../../share";
import { buzz, glide, useKeys } from "../common";
import { FB, TG } from "../pixel/icons";

/** Підписи інтерфейсу (не контент тесту) — усі в одному місці. */
const UI = {
  start: "Почати тест",
  next: "Наступне твердження",
  finish: "Мій результат",
  right: "Так і є!",
  wrong: "Насправді ні",
  picked: "Ваш вибір",
  sources: "Джерела:",
  again: "Пройти ще раз",
  take: "Пройти тест",
  copy: "Копіювати",
  copied: "Скопійовано",
  other: "Інше…",
  site: "hmarochos.kiev.ua",
  of: (t: number) => `з ${t}`,
  sharedResult: "Результат тесту",
  live: "правильних відповідей",
  nf: "Тут світла немає — сторінку не знайдено",
  home: "На початок",
};

// обкладинка — у рідній сітці 120×80 (збігається з малюнком піксель у піксель);
// лампочка, свічка й батарейка — оригінальні файли ілюстраторки без перетворень
const ART = {
  cover: "/art/px/cover.png",
  bulb: "/art/bulb-lamp.webp",
  candle: "/art/candle.webp",
  battery: "/art/battery.webp",
};
const LEVEL_ART: Record<Level["slug"], string> = { hostage: ART.candle, observer: ART.bulb, analyst: ART.battery };


/** Піксельна стрілка в сітці 9×8 — як у малюнку. */
const Arrow = () => (
  <svg className="arrow" viewBox="0 0 9 8" width="18" height="16" shapeRendering="crispEdges" aria-hidden>
    <path d="M5 0h1v1H5zM5 1h2v1H5zM5 2h3v1H5zM0 3h9v2H0zM5 5h3v1H5zM5 6h2v1H5zM5 7h1v1H5z" fill="currentColor" />
  </svg>
);

/** Пагорби ілюстраторки внизу сторінки, а на них — її вітряк і градирні з димом.
 *  scene=false — лише пагорби (на старті обкладинка вже показує і вітряк, і градирні). */
function Ground({ night, scene = true, plant = true }: { night?: boolean; scene?: boolean; plant?: boolean }) {
  return (
    <div className={`ground${night ? " night" : ""}${scene ? " scene" : ""}`} aria-hidden>
      {scene && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mill" src={asset("/art/windmill.webp")} alt="" decoding="async" />
          {plant && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="plant" src={asset("/art/plant.webp")} alt="" decoding="async" />
          )}
        </>
      )}
    </div>
  );
}

function Head() {
  return (
    <header className="head">
      <a className="brand" href="https://hmarochos.kiev.ua/" target="_blank" rel="noopener noreferrer" aria-label="Хмарочос — відкрити сайт">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset("/hmarochos_logo_new.svg")} alt="Хмарочос" width={87} height={32} />
        <span>{intro.short}</span>
      </a>
      <a className="site" href="https://hmarochos.kiev.ua/" target="_blank" rel="noopener noreferrer">
        {UI.site} ↗
      </a>
    </header>
  );
}

/** Лінія мережі з восьми підстанцій. history — пройдені твердження; now — поточне. */
function Grid({ history, now, fresh }: { history: boolean[]; now?: number; fresh?: boolean }) {
  const on = history.filter(Boolean).length;
  return (
    <div className="grid" role="img" aria-label={`Правильних відповідей: ${on} з ${TOTAL}`}>
      <span className="line" aria-hidden>
        <span className="pulse" />
      </span>
      {/* відрізки між підстанціями: струм іде до кожної ввімкненої, біля хибної — розрив */}
      {history.map((h, i) =>
        i === 0 ? null : (
          <span
            key={`s${i}`}
            className={`seg ${h ? "on" : "miss"}${i === history.length - 1 && fresh ? " fresh" : ""}`}
            style={{ left: `${((i - 1) / (TOTAL - 1)) * 100}%`, width: `${100 / (TOTAL - 1)}%` }}
            aria-hidden
          />
        ),
      )}
      {Array.from({ length: TOTAL }, (_, i) => {
        const st = i < history.length ? (history[i] ? "on" : "miss") : i === now ? "now" : "";
        return <i key={i} className={`node ${st}${i === history.length - 1 && fresh ? " fresh" : ""}`} style={{ left: `${(i / (TOTAL - 1)) * 100}%` }} />;
      })}
    </div>
  );
}

/** Ілюстрація без рамки, у рідній сітці 120×80 без розмиття. */
function Plate({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  return (
    <figure className={`plate ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset(src)} alt={alt} decoding="async" />
    </figure>
  );
}

/** Лампочка, свічка, батарейка — вільно, без рамки й тла: стоять збоку й світяться. */
function Free({ src, warm, hang, className = "" }: { src: string; warm?: boolean; hang?: boolean; className?: string }) {
  return (
    <figure className={`free${warm ? " warm" : ""}${hang ? " hang" : ""} ${className}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset(src)} alt="" decoding="async" />
    </figure>
  );
}

/** Копіювання з запасним шляхом: у вбудованих браузерах (Instagram, Facebook) clipboard API часто недоступний. */
async function copyText(t: string) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      /* не вдалося */
    }
    ta.remove();
    return ok;
  }
}

function Share({ url, text }: { url: string; text: string }) {
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
    if (await copyText(`${text} ${url}`)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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
      <div className="shareRow">
        <button type="button" className="sbtn" onClick={() => popup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d={FB} fill="currentColor" />
          </svg>
          Facebook
        </button>
        <button type="button" className="sbtn" onClick={() => popup(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`)}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d={TG} fill="currentColor" />
          </svg>
          Telegram
        </button>
        <button type="button" className={`sbtn${copied ? " done" : ""}`} onClick={copy}>
          {copied ? UI.copied : UI.copy}
        </button>
        {native && (
          <button type="button" className="sbtn" onClick={more}>
            {UI.other}
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
  img.src = src;
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

function Option({ v, q, picked, answered, onPick }: { v: Verdict; q: Question; picked: Verdict | null; answered: boolean; onPick: (v: Verdict) => void }) {
  const mine = answered && v === picked;
  const state = !answered ? "" : mine ? (v === q.correct ? " good" : " bad") : v === q.correct ? " truth" : " off";
  return (
    <button
      className={`opt${state}`}
      // aria-disabled замість disabled: рядок лишається у фокусі й озвучує свій стан
      aria-disabled={answered || undefined}
      data-verdict={String(v)}
      aria-keyshortcuts={v ? "1" : "2"}
      onClick={() => {
        if (!answered) onPick(v);
      }}
    >
      <span>{VERDICT_LABEL(v)}</span>
      {mine ? <span className="hint">{UI.picked}</span> : answered ? <span className="hint">{v === q.correct ? "✓" : ""}</span> : <span className="box" aria-hidden />}
    </button>
  );
}

function Sheet({ quiz }: { quiz: QuizApi }) {
  const { screen, q, idx, total, picked, history } = quiz;
  const answered = screen === "reveal";
  const ok = picked === q.correct;
  const stRef = useRef<HTMLParagraphElement>(null);
  const verRef = useRef<HTMLElement>(null);
  const lock = useRef(false);

  const pick = (v: Verdict) => {
    if (lock.current || answered) return;
    lock.current = true;
    buzz(v === q.correct ? 18 : [28, 45, 28]);
    quiz.answer(v);
  };

  useLayoutEffect(() => {
    if (screen === "question") {
      lock.current = false;
      scrollToStart();
      stRef.current?.focus({ preventScroll: true });
      return;
    }
    if (screen !== "reveal" || !verRef.current) return;
    const el = verRef.current;
    el.focus({ preventScroll: true });
    // підтягуємо вердикт, якщо він нижче за дві третини екрана; варіанти відповіді лишаються в кадрі
    const vh = window.innerHeight;
    const top = el.getBoundingClientRect().top;
    if (top < vh * 0.66) return;
    const opts = document.querySelector<HTMLElement>(".nm .opts");
    const keep = opts ? opts.getBoundingClientRect().top - 16 : top;
    const by = Math.min(top - vh * 0.35, keep);
    if (by <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) window.scrollTo(0, window.scrollY + by);
    else glide(window.scrollY + by, 450, "out");
  }, [screen, idx]);

  return (
    <main className="nm sheet">
      <div className="col">
        <Head />
        <Grid history={history} now={answered ? undefined : idx} fresh={answered} />
        <div className="qgrid">
          <div className="qmain" key={q.id}>
            <p className="num rise" data-scroll-anchor="(max-width: 899px)">
              <b>{String(idx + 1).padStart(2, "0")}</b>
              {UI.of(total)}
            </p>
            <p className={`st rise${answered ? " dim" : ""}`} ref={stRef} tabIndex={-1}>
              {q.statement}
            </p>
            <div className="opts">
              <Option v={true} q={q} picked={picked} answered={answered} onPick={pick} />
              <Option v={false} q={q} picked={picked} answered={answered} onPick={pick} />
            </div>
            {answered && (
              <section className={`ver rise ${ok ? "ok" : "miss"}`} ref={verRef} tabIndex={-1} aria-live="polite">
                {/* лампочка висить на шнурі з верхнього краю плашки, свічка стоїть на її куті */}
                <Free src={ok ? ART.bulb : ART.candle} warm={!ok} hang={ok} className={`verArt ${ok ? "lv-observer" : "lv-hostage"}`} />
                {ok && <span className="hangSpace" aria-hidden />}
                <div>
                  <b className="vt">{ok ? UI.right : UI.wrong}</b>
                  <p className="expl">{q.explanation}</p>
                  <Sources q={q} />
                </div>
                <button
                  className="cta wide"
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
      </div>
      <Ground plant={idx % 2 === 1} />
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
      const p = Math.min(1, (now - t0) / 900);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
}

function ResultBody({ level, history, fixed, onRestart }: { level: Level; history?: boolean[]; fixed?: number; onRestart?: () => void }) {
  const score = history ? history.filter(Boolean).length : fixed;
  // на шер-сторінці історії немає — вмикаємо стільки підстанцій, скільки балів
  const shown = history ?? Array.from({ length: fixed ?? level.max }, () => true);
  return (
    <main className="nm result">
      <div className="col">
        <Head />
        <Grid history={shown} />
        <div className="rgrid">
          <div className="rmain rise">
            <div className="rtop">
            <div>
            {!history && <p className="shared">{`${UI.sharedResult} «${intro.title}»`}</p>}
            {score !== undefined ? (
              <p className="score">
                <b>
                  <CountUp to={score} />
                </b>
                <span>
                  {UI.of(TOTAL)} {UI.live}
                </span>
              </p>
            ) : (
              <p className="score">
                <b className="range">{level.range}</b>
              </p>
            )}
            <h1 className="ltitle">{level.title}</h1>
            </div>
            {/* арт рівня — усередині плашки, праворуч від балів і звання; лампочка висить на її верхньому краї */}
            <Free src={LEVEL_ART[level.slug]} warm={level.slug === "hostage"} hang={level.slug === "observer"} className={`lv-${level.slug} rArt`} />
            </div>
            <p className="ldesc">{level.description}</p>
            {history ? (
              <Share
                url={score !== undefined ? scoreShareUrl(score) : resultShareUrl(level.slug)}
                text={score !== undefined ? `${score} з ${TOTAL}. ${level.shareText}` : level.shareText}
              />
            ) : (
              <Share url={`${SITE_URL}/`} text={TEST_SHARE_TEXT} />
            )}
            {onRestart ? (
              <button
                className="ghost"
                onClick={() => {
                  buzz(8);
                  onRestart();
                }}
              >
                {UI.again}
              </button>
            ) : (
              <a className="cta" href={asset("/")}>
                {UI.take}
                <Arrow />
              </a>
            )}
          </div>

        </div>
      </div>
      <Ground night={level.slug === "hostage"} />
    </main>
  );
}

export function ResultPage({ level, score }: { level: Level; score?: number }) {
  return <ResultBody level={level} fixed={score} />;
}

export function NotFound() {
  return (
    <main className="nm result nf">
      <div className="col">
        <Head />
        <div className="nfBox">
          <Free src={ART.candle} warm className="lv-hostage" />
          <h1 className="ltitle">{UI.nf}</h1>
          <a className="cta" href={asset("/")}>
            {UI.home}
            <Arrow />
          </a>
        </div>
      </div>
      <Ground night />
    </main>
  );
}

// ——— старт ———

export default function GridSkin({ quiz }: { quiz: QuizApi }) {
  const { screen, level, history } = quiz;
  useKeys(quiz);
  useEffect(() => {
    for (const a of [ART.bulb, ART.candle, ART.battery, "/art/windmill.webp", "/art/plant.webp"]) preload(asset(a));
  }, []);

  if (screen === "intro") {
    return (
      <main className="nm intro">
        <div className="col">
          <Head />
          <div className="hero">
            <div className="heroText rise">
              <h1 className="title">{intro.title}</h1>
              <Plate src={ART.cover} alt={COVER_ALT} className="heroPlate mobileOnly" />
              <p className="lead">{intro.lead}</p>
              <dl className="meta">
                <div>
                  <dt>{TOTAL}</dt>
                  <dd>тверджень</dd>
                </div>
                <div>
                  <dt>3 хв</dt>
                  <dd>на проходження</dd>
                </div>
                <div>
                  <dt>50 Гц</dt>
                  <dd>частота мережі</dd>
                </div>
              </dl>
              <button
                className="cta"
                onClick={() => {
                  buzz(8);
                  quiz.start();
                }}
              >
                {UI.start}
                <Arrow />
              </button>
            </div>
            <Plate src={ART.cover} alt={COVER_ALT} className="heroPlate deskOnly" />
          </div>
          <Grid history={[]} />
        </div>
        <Ground scene={false} />
      </main>
    );
  }

  if (screen === "question" || screen === "reveal") return <Sheet quiz={quiz} />;

  return <ResultBody level={level} history={history} onRestart={quiz.restart} />;
}
