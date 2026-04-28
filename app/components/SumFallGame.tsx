"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WIN_SCORE = 500;
const LOSE_SCORE = -500;
const FALL_SPEED = 0.11; // fraction of field height per second
const SPAWN_INTERVAL_MS = 2200;
const MAX_SUMS = 6;
const BOTTOM_LINE = 0.86;

export type GameMode = "simple" | "intermediate" | "advanced";

/** Resultado a + b estrictamente menor que este valor. */
const MODE_MAX_EXCLUSIVE: Record<GameMode, number> = {
  simple: 25,
  intermediate: 60,
  advanced: 100,
};

type FallingSum = {
  id: string;
  a: number;
  b: number;
  x: number; // 0–1 horizontal position in playfield
  y: number; // 0 top → 1 bottom
};

function randomSum(mode: GameMode): Omit<FallingSum, "id" | "y"> {
  const maxSum = MODE_MAX_EXCLUSIVE[mode];
  const minTotal = 4; // 2 + 2
  const maxTotal = maxSum - 1;
  const total =
    minTotal + Math.floor(Math.random() * (maxTotal - minTotal + 1));
  const aMin = 2;
  const aMax = total - 2;
  const a = aMin + Math.floor(Math.random() * (aMax - aMin + 1));
  const b = total - a;
  const x = 0.08 + Math.random() * 0.72;
  return { a, b, x };
}

export default function SumFallGame() {
  const [score, setScore] = useState(0);
  const [sums, setSums] = useState<FallingSum[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [spawnCountdownTenths, setSpawnCountdownTenths] = useState(0);
  const [spawnAtCap, setSpawnAtCap] = useState(false);
  const [mode, setMode] = useState<GameMode>("simple");

  /** Lista autoritativa para el RAF y trySubmit — no pisar desde render. */
  const sumsRef = useRef<FallingSum[]>([]);
  const modeRef = useRef<GameMode>("simple");
  modeRef.current = mode;
  const lastSpawnRef = useRef(0);
  const lastFrameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const statusRef = useRef(status);
  const lastCountdownTenthsRef = useRef<number | null>(null);
  const lastAtCapRef = useRef<boolean | null>(null);

  statusRef.current = status;

  const beginGame = useCallback((m: GameMode) => {
    setScore(0);
    const first: FallingSum = {
      id: crypto.randomUUID(),
      ...randomSum(m),
      y: 0.06,
    };
    sumsRef.current = [first];
    setSums([first]);
    setInput("");
    setStatus("playing");
    const t = performance.now();
    lastSpawnRef.current = t;
    lastFrameRef.current = t;
    lastCountdownTenthsRef.current = null;
    lastAtCapRef.current = null;
  }, []);

  const playAgain = useCallback(() => {
    beginGame(modeRef.current);
  }, [beginGame]);

  const selectMode = useCallback(
    (m: GameMode) => {
      modeRef.current = m;
      setMode(m);
      beginGame(m);
    },
    [beginGame],
  );

  const trySubmit = useCallback(() => {
    if (statusRef.current !== "playing") return;
    const n = Number.parseInt(input.trim(), 10);
    if (Number.isNaN(n)) return;

    const list = sumsRef.current;
    const matches = list.filter((s) => s.a + s.b === n);
    if (matches.length === 0) return;
    const target = matches.reduce((best, s) => (s.y > best.y ? s : best));
    const value = target.a + target.b;
    const next = list.filter((s) => s.id !== target.id);
    sumsRef.current = next;
    setSums(next);
    setScore((s) => {
      const nv = s + value;
      if (nv >= WIN_SCORE) setStatus("won");
      return nv;
    });
    setInput("");
  }, [input]);

  useEffect(() => {
    beginGame("simple");
  }, [beginGame]);

  useEffect(() => {
    const tick = (now: number) => {
      if (statusRef.current !== "playing") {
        if (
          lastCountdownTenthsRef.current !== null ||
          lastAtCapRef.current !== null
        ) {
          lastCountdownTenthsRef.current = null;
          lastAtCapRef.current = null;
          setSpawnCountdownTenths(0);
          setSpawnAtCap(false);
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const prevFrame = lastFrameRef.current || now;
      lastFrameRef.current = now;
      const dt = Math.min((now - prevFrame) / 1000, 0.08);

      const prev = sumsRef.current;
      const next: FallingSum[] = [];
      let deltaScore = 0;

      for (const s of prev) {
        const ny = s.y + FALL_SPEED * dt;
        if (ny >= BOTTOM_LINE) {
          deltaScore -= s.a + s.b;
        } else {
          next.push({ ...s, y: ny });
        }
      }

      if (deltaScore !== 0) {
        setScore((sc) => {
          const ns = sc + deltaScore;
          if (ns <= LOSE_SCORE) setStatus("lost");
          return ns;
        });
      }

      // Tablero vacío → siempre intentar una nueva (acierto entre frames,
      // varias que tocan suelo a la vez, etc.). Con sumas en pantalla, solo
      // según intervalo desde lastSpawnRef.
      const canSpawn =
        next.length < MAX_SUMS &&
        (next.length === 0 ||
          now - lastSpawnRef.current > SPAWN_INTERVAL_MS);

      if (canSpawn) {
        lastSpawnRef.current = now;
        const r = randomSum(modeRef.current);
        next.push({
          id: crypto.randomUUID(),
          ...r,
          y: -0.02,
        });
      }

      sumsRef.current = next;
      setSums(next);

      const elapsedSpawn = now - lastSpawnRef.current;
      const rawLeft = Math.max(0, SPAWN_INTERVAL_MS - elapsedSpawn);
      const tenths = Math.ceil(rawLeft / 100);
      const atCap = sumsRef.current.length >= MAX_SUMS;
      if (
        tenths !== lastCountdownTenthsRef.current ||
        atCap !== lastAtCapRef.current
      ) {
        lastCountdownTenthsRef.current = tenths;
        lastAtCapRef.current = atCap;
        setSpawnCountdownTenths(tenths);
        setSpawnAtCap(atCap);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Lluvia de sumas
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Escribe el resultado y pulsa Enter. Ganas con {WIN_SCORE} puntos,
          pierdes con {LOSE_SCORE}.
        </p>
        <div
          className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-center sm:gap-2"
          role="group"
          aria-label="Dificultad"
        >
          {(
            [
              { id: "simple" as const, label: "Simple" },
              { id: "intermediate" as const, label: "Intermedio" },
              { id: "advanced" as const, label: "Avanzado" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => selectMode(opt.id)}
              className={`flex flex-1 flex-col rounded-xl border px-3 py-2.5 text-left transition-colors sm:min-w-[7.5rem] sm:text-center ${
                mode === opt.id
                  ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-600"
                  : "border-zinc-300 bg-white text-zinc-800 hover:border-indigo-400 hover:bg-indigo-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/50"
              }`}
            >
              <span className="text-sm font-semibold">{opt.label}</span>
              <span
                className={`mt-0.5 text-xs ${
                  mode === opt.id
                    ? "text-indigo-100"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {opt.id === "simple" && "Resultado menor que 25"}
                {opt.id === "intermediate" && "Resultado menor que 60"}
                {opt.id === "advanced" && "Resultado menor que 100"}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          Cambiar de modo reinicia la partida y la puntuación.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Puntuación
          </span>
          <span
            className={`font-mono text-2xl font-bold tabular-nums ${
              score >= WIN_SCORE
                ? "text-emerald-600 dark:text-emerald-400"
                : score <= LOSE_SCORE
                  ? "text-red-600 dark:text-red-400"
                  : score > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : score < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground"
            }`}
          >
            {score}
          </span>
        </div>
        {status === "playing" && (
          <div className="flex items-center justify-between rounded-xl border border-indigo-200/80 bg-indigo-50/80 px-4 py-2.5 dark:border-indigo-900/60 dark:bg-indigo-950/40">
            <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
              Próxima suma
            </span>
            <div className="text-right">
              <span className="font-mono text-lg font-semibold tabular-nums text-indigo-950 dark:text-indigo-50">
                {(spawnCountdownTenths / 10).toFixed(1)} s
              </span>
              {spawnAtCap && spawnCountdownTenths > 0 && (
                <p className="mt-0.5 text-xs text-indigo-600/85 dark:text-indigo-400/85">
                  Máx. {MAX_SUMS} en pantalla: el tiempo sigue, pero hasta que
                  haya hueco no caerá otra.
                </p>
              )}
              {spawnAtCap && spawnCountdownTenths === 0 && (
                <p className="mt-0.5 max-w-[14rem] text-xs leading-snug text-indigo-700/90 dark:text-indigo-300/90">
                  Pantalla llena — resuelve o deja caer una para que aparezca
                  otra.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative h-[min(78vh,720px)] min-h-[420px] overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-gradient-to-b from-sky-50 to-indigo-50 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950">
        <div
          className="pointer-events-none absolute right-0 bottom-0 left-0 h-[14%] border-t-2 border-amber-400/80 bg-amber-100/40 dark:bg-amber-950/30"
          aria-hidden
        />
        {sums.map((s) => (
          <div
            key={s.id}
            className="pointer-events-none absolute flex min-w-[4.5rem] -translate-x-1/2 items-center justify-center rounded-lg border border-indigo-200 bg-white/95 px-3 py-2 font-mono text-lg font-semibold text-indigo-900 shadow-md dark:border-indigo-800 dark:bg-zinc-800/95 dark:text-indigo-100"
            style={{
              left: `${s.x * 100}%`,
              top: `${s.y * 100}%`,
            }}
          >
            {s.a} + {s.b}
          </div>
        ))}

        {status === "won" && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/40 backdrop-blur-[2px]">
            <div className="rounded-2xl border border-emerald-400/50 bg-emerald-950/90 px-6 py-5 text-center text-emerald-50 shadow-xl">
              <p className="text-xl font-semibold">¡Ganaste!</p>
              <p className="mt-1 text-sm text-emerald-200/90">
                Llegaste a {WIN_SCORE} puntos.
              </p>
              <button
                type="button"
                onClick={playAgain}
                className="mt-4 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
              >
                Jugar otra vez
              </button>
            </div>
          </div>
        )}
        {status === "lost" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-950/40 backdrop-blur-[2px]">
            <div className="rounded-2xl border border-red-400/50 bg-red-950/90 px-6 py-5 text-center text-red-50 shadow-xl">
              <p className="text-xl font-semibold">Perdiste</p>
              <p className="mt-1 text-sm text-red-200/90">
                Llegaste a {LOSE_SCORE} puntos.
              </p>
              <button
                type="button"
                onClick={playAgain}
                className="mt-4 rounded-full bg-red-500 px-5 py-2 text-sm font-medium text-red-950 hover:bg-red-400"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          placeholder="Resultado…"
          value={input}
          disabled={status !== "playing"}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") trySubmit();
          }}
          className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-lg text-foreground outline-none ring-indigo-500/30 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900"
        />
        <button
          type="button"
          disabled={status !== "playing"}
          onClick={trySubmit}
          className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
