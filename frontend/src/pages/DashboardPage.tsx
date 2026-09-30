import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import DifficultyBadge from "../components/DifficultyBadge";
import Navbar from "../components/Navbar";
import Skeleton from "../components/Skeleton";
import { button, card, ghost, input } from "../components/ui";
import { listProblems, listTags, type ProblemList, type Tag } from "../services/problems";

export default function DashboardPage() {
  const [data, setData] = useState<ProblemList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("id");
  const [tags, setTags] = useState<Tag[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listTags().then(setTags).catch(() => setTags([]));
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    let live = true; // ignore responses from stale searches
    setError(null);
    listProblems(page, query, difficulty, tag)
      .then((d) => live && setData(d))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [page, query, difficulty, tag]);

  const items = useMemo(() => {
    const rows = [...(data?.items ?? [])];
    if (sort === "title") rows.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "acceptance") rows.sort((a, b) => {
      const rateA = a.total_submissions ? a.accepted_submissions / a.total_submissions : -1;
      const rateB = b.total_submissions ? b.accepted_submissions / b.total_submissions : -1;
      return rateB - rateA;
    });
    return rows;
  }, [data, sort]);

  const pageAcceptance = data?.items.length
    ? Math.round(data.items.reduce((sum, problem) => sum + (problem.total_submissions ? problem.accepted_submissions / problem.total_submissions : 0), 0) / data.items.length * 100)
    : 0;

  const search = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(title.trim());
  };
  const clear = () => {
    setTitle("");
    setQuery("");
    setDifficulty("");
    setTag("");
    setPage(1);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-7">
        <header className="animate-fade-up flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted">Practice library</p>
            <h1 className="text-3xl font-semibold tracking-tight">Problems</h1>
            <p className="mt-2 text-sm text-muted">Choose a challenge and work through it at your own pace.</p>
          </div>
          <div className="text-sm text-muted">{data ? `${data.total} problems in the library` : "Loading problem library"}</div>
        </header>
        <section className={`${card} grid gap-0 sm:grid-cols-3`} aria-label="Problem set overview">
          <div className="border-b p-4 sm:border-b-0 sm:border-r" style={{ borderColor: "var(--line)" }}>
            <p className="text-xs text-muted">Total problems</p><p className="mt-1 text-xl font-semibold">{data?.total ?? "—"}</p>
          </div>
          <div className="border-b p-4 sm:border-b-0 sm:border-r" style={{ borderColor: "var(--line)" }}>
            <p className="text-xs text-muted">Current page acceptance</p><p className="mt-1 text-xl font-semibold">{data ? `${pageAcceptance}%` : "—"}</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted">Current page</p><p className="mt-1 text-xl font-semibold">{data ? `${data.page}${data.has_more ? "+" : ""}` : "—"}</p>
          </div>
        </section>
        <form onSubmit={search} className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto_auto]">
          <div className="relative">
            <input ref={searchRef} className={`${input} pr-20`} placeholder="Search problems" aria-label="Search by title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-[10px] text-muted" style={{ borderColor: "var(--line)" }}>⌘ K</kbd>
          </div>
          <select className={input} aria-label="Filter by difficulty" value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}>
            <option value="">All difficulties</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
          </select>
          <select className={input} aria-label="Filter by category" value={tag} onChange={(e) => { setTag(e.target.value); setPage(1); }}>
            <option value="">All categories</option>{tags.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
          <select className={input} aria-label="Sort problems" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="id">Default order</option><option value="title">Title A–Z</option><option value="acceptance">Acceptance rate</option>
          </select>
          <button className={button}>Search</button>
          {(query || difficulty || tag) && <button type="button" className={ghost} onClick={clear}>Clear</button>}
        </form>
        {error && (
          <div role="alert" className="flex items-center justify-between rounded-lg border border-rose-500/50 p-3 text-sm text-rose-400">
            {error}
            <button className={ghost} onClick={() => setQuery(query + " ")}>Retry</button>
          </div>
        )}
        {!data && !error && (
          <div className={`${card} space-y-2 p-4`}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        )}
        {data && (
          <>
            <section className={`${card} overflow-hidden`} aria-label="Problem directory">
              <div className="directory-row px-4 py-3 text-[11px] font-semibold uppercase text-muted max-sm:[&>*:nth-child(n+4)]:hidden">
                <span aria-label="Status">#</span><span>Problem</span><span>Category</span><span>Difficulty</span><span>Acceptance</span><span></span>
              </div>
              {items.map((p, i) => {
                const rate = p.total_submissions ? Math.round((p.accepted_submissions / p.total_submissions) * 100) : 0;
                return (
                  <Link key={p.id} to={`/problems/${p.id}`} className="directory-row group px-4 py-4 transition-colors hover:bg-[var(--surface-soft)]" style={{ animationDelay: `${i * 30}ms` }}>
                    <span className="font-mono text-xs text-muted">{p.id}</span>
                    <span className="font-medium group-hover:text-[var(--accent)]">{p.title}</span>
                    <span className="flex flex-wrap gap-1">{p.tags.slice(0, 2).map((t) => <span key={t} className="rounded-full bg-[var(--surface-soft)] px-2 py-1 text-xs text-muted">{t}</span>)}</span>
                    <span><DifficultyBadge level={p.difficulty} /></span>
                    <span className="text-sm tabular-nums text-muted" title={`${p.accepted_submissions} of ${p.total_submissions} accepted`}>
                      {p.total_submissions ? `${rate}%` : "—"}<span className="ml-1 text-xs">{p.total_submissions ? "accepted" : "new"}</span>
                    </span>
                    <span className="text-right text-sm font-medium text-[var(--accent)]">Solve <span aria-hidden>↗</span></span>
                  </Link>
                );
              })}
            </section>
            {data.items.length === 0 && (
              <p className="animate-fade-up py-10 text-center text-muted">{query ? `No problems match "${query}".` : "No problems match these filters."}</p>
            )}
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Page {data.page} · {data.total} total</span>
              <span className="flex gap-2">
                {page > 1 && <button className={ghost} onClick={() => setPage(page - 1)}>Previous</button>}
                {data.has_more && <button className={ghost} onClick={() => setPage(page + 1)}>Next</button>}
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
