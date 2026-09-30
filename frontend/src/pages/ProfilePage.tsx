import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { button, card, ghost, input } from "../components/ui";
import { updateMe } from "../services/auth";
import { useAuth } from "../hooks/useAuth";
import { listUserSubmissions, type SubmissionHeader, type Verdict } from "../services/submissions";

const VERDICT_STYLE: Record<Verdict, string> = {
  PD: "text-amber-400", AC: "text-emerald-400", WA: "text-rose-400", TLE: "text-orange-400",
  MLE: "text-orange-400", CE: "text-rose-400", RE: "text-rose-400", SKP: "text-slate-400",
};

function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [form, setForm] = useState({ username: "", email: "" });

  useEffect(() => {
    if (!user) return;
    setForm({ username: user.username, email: user.email });
    let active = true;
    setLoading(true);
    listUserSubmissions(user.username)
      .then((items) => active && setSubmissions(items))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user]);

  const activity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const submission of submissions) {
      const key = localDay(new Date(/(Z|[+-]\d\d:\d\d)$/i.test(submission.submitted_at) ? submission.submitted_at : `${submission.submitted_at}Z`));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 84 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (83 - index));
      const key = localDay(date);
      const count = counts.get(key) ?? 0;
      return { key, count, level: count === 0 ? 0 : Math.min(4, Math.ceil(count / 2)), label: date.toLocaleDateString() };
    });
  }, [submissions]);

  const accepted = submissions.filter((item) => item.verdict === "AC");
  const solved = new Set(accepted.map((item) => item.problem_id)).size;
  const acceptance = submissions.length ? Math.round(accepted.length / submissions.length * 100) : 0;
  const activeDays = activity.filter((day) => day.count > 0).length;

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateMe({ username: form.username.trim(), email: form.email.trim() });
      await refreshUser();
      setEditing(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your profile");
    } finally {
      setSaving(false);
    }
  };

  const shareProfile = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage("Profile link copied");
      window.setTimeout(() => setShareMessage(""), 1800);
    } catch {
      setShareMessage("Could not copy profile link");
    }
  };

  if (!user) return <><Navbar /><main className="mx-auto max-w-4xl p-6 text-muted">Loading account…</main></>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-7">
        <header className="flex flex-wrap items-center justify-between gap-5">
          <div><p className="mb-2 text-xs font-semibold uppercase text-muted">Your account</p><h1 className="text-3xl font-semibold tracking-tight">Profile</h1></div>
          <div className="flex items-center gap-2">
            <button className={ghost} onClick={() => void shareProfile()}>Share</button>
            <button className={ghost} onClick={() => { setEditing((value) => !value); setError(null); }}>{editing ? "Cancel" : "Edit profile"}</button>
          </div>
        </header>

        <section className={`${card} flex flex-wrap items-center gap-5 p-5 sm:p-7`}>
          <div className="profile-avatar" aria-hidden>{user.username.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold">{user.username}</h2>
            <p className="mt-1 text-sm text-muted">@{user.username} · {user.user_type === "ADMIN" ? "Administrator" : "Member"}</p>
            <p className="mt-2 text-sm text-muted">Joined {new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-muted">{user.is_verified ? "Verified account" : "Unverified account"}</span>
        </section>

        {editing && (
          <form className={`${card} grid gap-4 p-5 sm:grid-cols-2`} onSubmit={saveProfile}>
            <label className="space-y-1.5 text-sm">Username<input className={input} autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
            <label className="space-y-1.5 text-sm">Email<input className={input} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <div className="flex items-center gap-3 sm:col-span-2"><button className={button} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>{saved && <span role="status" className="text-sm text-emerald-400">Profile updated</span>}</div>
          </form>
        )}
        {error && <p role="alert" className="rounded-lg border border-rose-500/40 p-3 text-sm text-rose-400">{error}</p>}
        {shareMessage && <p role="status" className="text-sm text-muted">{shareMessage}</p>}

        <section className={`${card} grid grid-cols-2 overflow-hidden sm:grid-cols-4`} aria-label="Recent submission summary">
          <Stat label="Submissions loaded" value={loading ? "…" : submissions.length} hint="Latest 100" />
          <Stat label="Problems accepted" value={loading ? "…" : solved} hint="Unique in latest 100" />
          <Stat label="Acceptance rate" value={loading ? "…" : `${acceptance}%`} hint="Latest 100" />
          <Stat label="Active days" value={loading ? "…" : activeDays} hint="Past 12 weeks" />
        </section>

        <section className={`${card} space-y-4 p-5 sm:p-6`}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><h2 className="font-semibold">Submission activity</h2><p className="mt-1 text-xs text-muted">Daily activity from the latest 100 submission records, over the past 12 weeks.</p></div>
            <span className="text-xs text-muted">{activity.reduce((sum, day) => sum + day.count, 0)} submissions shown</span>
          </div>
          <div className="overflow-x-auto pb-1" aria-label="12-week submission activity heatmap">
            <div className="activity-grid" role="img" aria-label={`${activeDays} active days in the past 12 weeks`}>
              {activity.map((day) => <span key={day.key} className="activity-cell" data-level={day.level} title={`${day.label}: ${day.count} submissions`} />)}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 text-[11px] text-muted"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <span key={level} className="activity-cell" data-level={level} />)}<span>More</span></div>
        </section>

        <section className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--line)" }}>
            <div><h2 className="font-semibold">Recent submissions</h2><p className="mt-1 text-xs text-muted">Latest judged activity on your account.</p></div>
            <span className="text-xs text-muted">{submissions.length} loaded</span>
          </div>
          {loading ? <p className="p-5 text-sm text-muted">Loading activity…</p> : submissions.length === 0 ? <p className="p-5 text-sm text-muted">No submissions yet. Solve a problem to start your activity history.</p> : (
            <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
              {submissions.slice(0, 12).map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                  <span className={`w-9 font-semibold ${VERDICT_STYLE[item.verdict]}`}>{item.verdict}</span>
                  <Link to={`/problems/${encodeURIComponent(item.problem_id)}`} className="min-w-28 flex-1 font-medium hover:text-[var(--accent)]">Problem {item.problem_id}</Link>
                  <span className="text-xs text-muted">{item.walltime_ms != null ? `${item.walltime_ms} ms` : "Runtime pending"}</span>
                  <time className="text-xs text-muted" dateTime={item.submitted_at}>{new Date(/(Z|[+-]\d\d:\d\d)$/i.test(item.submitted_at) ? item.submitted_at : `${item.submitted_at}Z`).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return <div className="profile-stat"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-[11px] text-muted">{hint}</p></div>;
}