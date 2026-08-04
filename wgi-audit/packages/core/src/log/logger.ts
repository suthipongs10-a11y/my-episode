/**
 * Logging.
 *
 * `console.log` is banned by the project rules because a run has to be
 * explainable after it finishes, not only while you are watching it. Every
 * line goes to stdout for the operator and, when a run id is attached, is
 * available to be persisted with that run.
 */
export type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface LogLine {
  ts: string;
  level: Level;
  stage?: string;
  runId?: string;
  msg: string;
  data?: Record<string, unknown>;
}

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  child(bindings: { stage?: string; runId?: string }): Logger;
  /** Everything emitted through this logger and its children, in order. */
  lines(): LogLine[];
}

export interface LoggerOptions {
  level?: Level;
  runId?: string;
  stage?: string;
  /** Set false in tests so output stays readable. */
  stdout?: boolean;
  sink?: LogLine[];
}

export function createLogger(opts: LoggerOptions = {}): Logger {
  const level = opts.level ?? (process.env.LOG_LEVEL as Level) ?? "info";
  // Quiet under vitest unless a test asks otherwise: a passing suite should
  // print its results, not a replay of every run it made.
  const stdout = opts.stdout ?? !(process.env.VITEST && process.env.LOG_LEVEL === undefined);
  const sink: LogLine[] = opts.sink ?? [];

  function emit(l: Level, msg: string, data?: Record<string, unknown>): void {
    if (ORDER[l] < ORDER[level]) return;
    const line: LogLine = {
      ts: new Date().toISOString(),
      level: l,
      msg,
      ...(opts.stage ? { stage: opts.stage } : {}),
      ...(opts.runId ? { runId: opts.runId } : {}),
      ...(data ? { data } : {}),
    };
    sink.push(line);
    if (stdout) process.stdout.write(format(line) + "\n");
  }

  return {
    debug: (m, d) => emit("debug", m, d),
    info: (m, d) => emit("info", m, d),
    warn: (m, d) => emit("warn", m, d),
    error: (m, d) => emit("error", m, d),
    child: (b) => createLogger({ ...opts, ...b, sink, level, stdout }),
    lines: () => sink,
  };
}

const MARK: Record<Level, string> = { debug: "·", info: "•", warn: "!", error: "✗" };

function format(l: LogLine): string {
  const t = l.ts.slice(11, 19);
  const where = l.stage ? ` [${l.stage}]` : "";
  const extra = l.data && Object.keys(l.data).length ? "  " + compact(l.data) : "";
  return `${t} ${MARK[l.level]}${where} ${l.msg}${extra}`;
}

/** Short one-line rendering of a data bag; long values are elided. */
function compact(d: Record<string, unknown>): string {
  return Object.entries(d)
    .map(([k, v]) => {
      const s =
        typeof v === "string"
          ? v
          : v === null || v === undefined
            ? String(v)
            : JSON.stringify(v);
      return `${k}=${s.length > 80 ? s.slice(0, 77) + "…" : s}`;
    })
    .join(" ");
}
