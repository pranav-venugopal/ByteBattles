import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Link, useParams } from "react-router-dom";
import CodeEditor from "../components/CodeEditor";
import DifficultyBadge from "../components/DifficultyBadge";
import Navbar from "../components/Navbar";
import Skeleton from "../components/Skeleton";
import SubmissionHistory from "../components/SubmissionHistory";
import SubmissionPanel from "../components/SubmissionPanel";
import { LANGUAGES, STARTERS } from "../components/languages";
import { button, ghost, input } from "../components/ui";
import { useSubmission } from "../hooks/useSubmission";
import { ApiError } from "../services/api";
import { getProblem, type ProblemDetail } from "../services/problems";
import { listMySubmissions, type Language, type SubmissionHeader } from "../services/submissions";

export default function ProblemPage() {
  const { id = "" } = useParams();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loadError, setLoadError] = useState<ApiError | Error | null>(null);
  const [language, setLanguage] = useState<Language>("PY");
  const [code, setCode] = useState(STARTERS.PY);
  const [editorTheme, setEditorTheme] = useState<"light" | "dark">(() => localStorage.getItem("bb_editor_theme") === "dark" ? "dark" : "light");
  const [history, setHistory] = useState<SubmissionHeader[]>([]);
  const [split, setSplit] = useState(50);
  const [panel, setPanel] = useState<"result" | "submissions">("result");
  const [copiedSample, setCopiedSample] = useState<string | null>(null);
  const storageKey = `bb_code_${id}_${language}`;
  const loadedKey = useRef(""); // guards against saving a starter/old draft under the wrong key
  const workspaceRef = useRef<HTMLElement>(null);

  const refreshHistory = useCallback(() => void listMySubmissions(id).then(setHistory).catch(() => {}), [id]);
  const { run, show, result, error, busy } = useSubmission(refreshHistory);

  useEffect(() => {
    setProblem(null);
    setLoadError(null);
    getProblem(id).then(setProblem).catch(setLoadError);
    refreshHistory();
  }, [id, refreshHistory]);

  // Restore this problem's draft for the chosen language, or fall back to the starter
  useEffect(() => {
    setCode(localStorage.getItem(storageKey) ?? STARTERS[language]);
    loadedKey.current = storageKey;
  }, [storageKey, language]);

  const onChange = (v: string) => {
    setCode(v);
    if (loadedKey.current === storageKey) localStorage.setItem(storageKey, v);
  };

  const submitNow = useCallback(() => {
    if (!busy && problem && code.trim()) void run(id, language, code);
  }, [busy, problem, code, run, id, language]);

  // Ctrl/Cmd+Enter submits, even while the editor has focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        submitNow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitNow]);

  const resetCode = () => {
    if (confirm("Reset to the starter code? Your draft for this language will be lost.")) onChange(STARTERS[language]);
  };

  const resizeSplit = (event: PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1 || !workspaceRef.current) return;
    const bounds = workspaceRef.current.getBoundingClientRect();
    setSplit(Math.min(68, Math.max(32, ((event.clientX - bounds.left) / bounds.width) * 100)));
  };

  const copySample = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedSample(key);
      window.setTimeout(() => setCopiedSample(null), 1400);
    } catch {
      setCopiedSample(null);
    }
  };

  const notFound = loadError instanceof ApiError && loadError.status === 404;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <div className="workspace-toolbar">
          <Link to="/" className="text-sm text-muted hover:text-[var(--accent)]">Problems</Link>
          <span className="text-muted" aria-hidden>/</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{problem?.title ?? id}</span>
          <label htmlFor="lang" className="sr-only">Language</label>
          <select id="lang" className={`${input} w-auto py-2`} value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <button
            className={ghost}
            type="button"
            aria-pressed={editorTheme === "dark"}
            aria-label={`Switch editor to ${editorTheme === "dark" ? "light" : "dark"} theme`}
            onClick={() => setEditorTheme((theme) => {
              const next = theme === "dark" ? "light" : "dark";
              localStorage.setItem("bb_editor_theme", next);
              return next;
            })}
          >
            <span aria-hidden>{editorTheme === "dark" ? "☼" : "◐"}</span> {editorTheme === "dark" ? "Light editor" : "Dark editor"}
          </button>
          <button className={ghost} onClick={resetCode} title="Restore starter code">Reset</button>
          <button className={button} disabled={busy || !problem || !code.trim()} onClick={submitNow}>
            {busy ? "Judging…" : "Submit"}
          </button>
        </div>
        <section
          ref={workspaceRef}
          className="workspace-grid"
          style={{ gridTemplateColumns: `${split}% 8px minmax(0, 1fr)` }}
          onPointerMove={resizeSplit}
        >
        <section className="workspace-pane space-y-6">
          {loadError && (
            <p role="alert" className="text-rose-400">{notFound ? "This problem doesn't exist or is hidden." : loadError.message}</p>
          )}
          {!problem && !loadError && (
            <div className="space-y-3"><Skeleton className="h-9 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-32" /></div>
          )}
          {problem && (
            <div className="animate-fade-up space-y-7">
              <header className="space-y-3">
                <div className="flex flex-wrap items-center gap-2"><DifficultyBadge level={problem.difficulty} />{problem.tags.map((t) => <span key={t} className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-xs text-muted">{t}</span>)}</div>
                <h1 className="text-3xl font-semibold tracking-tight">{problem.title}</h1>
                <div className="flex flex-wrap gap-2 text-xs text-muted">
                  <span className="rounded-full border px-2.5 py-1" style={{ borderColor: "var(--line)" }}>Time limit · {problem.time_limit_sec}s</span>
                  <span className="rounded-full border px-2.5 py-1" style={{ borderColor: "var(--line)" }}>Memory · {problem.memory_limit_mb} MB</span>
                </div>
              </header>
              <section className="space-y-3 leading-7">
                <h2 className="text-sm font-semibold">Description</h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted">{problem.description}</p>
              </section>
              <section className="space-y-3 rounded-xl border bg-[var(--surface-soft)] p-4" style={{ borderColor: "var(--line)" }}>
                <h2 className="text-sm font-semibold">Constraints</h2>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{problem.constraints.map((c) => <li key={c}>{c}</li>)}</ul>
              </section>
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><h2 className="text-sm font-semibold">Input</h2><p className="whitespace-pre-wrap text-sm text-muted">{problem.input_desc}</p></div>
                <div className="space-y-2"><h2 className="text-sm font-semibold">Output</h2><p className="whitespace-pre-wrap text-sm text-muted">{problem.output_desc}</p></div>
              </section>
              <section className="space-y-3">
                <h2 className="text-sm font-semibold">Examples</h2>
                {Object.entries(problem.sample_io).map(([k, v]) => (
                  <div key={k} className="sample-block">
                    <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted" style={{ borderColor: "var(--line)" }}>
                      <span>Example {k}</span>
                      <button className="text-[var(--accent)] hover:underline" onClick={() => void copySample(k, v)} aria-label={`Copy example ${k}`}>
                        {copiedSample === k ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre>{v}</pre>
                  </div>
                ))}
              </section>
              {problem.explanation && <section className="space-y-2"><h2 className="text-sm font-semibold">Explanation</h2><p className="whitespace-pre-wrap text-sm text-muted">{problem.explanation}</p></section>}
            </div>
          )}
        </section>
        <div className="workspace-divider" role="separator" aria-label="Resize problem and editor panels" aria-orientation="vertical" onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)} />
        <section className="workspace-pane space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-semibold">Your solution</p><p className="mt-1 text-xs text-muted">Draft saved in this browser · Ctrl/Cmd + Enter to submit</p></div>
            <span className="text-xs text-muted">{LANGUAGES.find((item) => item.value === language)?.label}</span>
          </div>
          <div className={`overflow-hidden rounded-xl border ${editorTheme === "dark" ? "editor-dark" : "editor-light"}`} style={{ borderColor: "var(--line)" }}>
            <CodeEditor language={language} value={code} onChange={onChange} theme={editorTheme} />
          </div>
          <div className="flex gap-5 border-b" role="tablist" aria-label="Editor output panels" style={{ borderColor: "var(--line)" }}>
            <button role="tab" aria-selected={panel === "result"} onClick={() => setPanel("result")} className={`border-b-2 px-1 py-2 text-sm ${panel === "result" ? "border-[var(--accent)] font-medium text-[var(--accent)]" : "border-transparent text-muted"}`}>Result</button>
            <button role="tab" aria-selected={panel === "submissions"} onClick={() => setPanel("submissions")} className={`border-b-2 px-1 py-2 text-sm ${panel === "submissions" ? "border-[var(--accent)] font-medium text-[var(--accent)]" : "border-transparent text-muted"}`}>Submissions {history.length > 0 ? `(${history.length})` : ""}</button>
          </div>
          {panel === "result" ? <SubmissionPanel result={result} error={error} busy={busy} /> : <SubmissionHistory items={history} onSelect={(sid) => void show(sid)} />}
        </section>
        </section>
      </main>
    </div>
  );
}
