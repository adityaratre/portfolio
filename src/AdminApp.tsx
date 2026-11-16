import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getPortfolioData, setPortfolioData } from './data/portfolio';
import {
  backendConfigured,
  getCurrentAdmin,
  loadPublicPortfolioContent,
  savePortfolioContent,
  signInAdmin,
  signOutAdmin,
  type AdminUser,
} from './lib/portfolioApi';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '◫' },
  { id: 'profile', label: 'Profile & bio', fields: ['profile'], icon: '◉' },
  { id: 'education', label: 'Education', fields: ['education'], icon: '▤' },
  { id: 'experience', label: 'Experience', fields: ['experience'], icon: '⌑' },
  { id: 'projects', label: 'Projects', fields: ['projects'], icon: '▧' },
  { id: 'skills', label: 'Skills', fields: ['skillCategories', 'skillEvidence'], icon: '✳' },
  { id: 'achievements', label: 'Achievements', fields: ['achievements', 'certifications'], icon: '✦' },
  { id: 'journey', label: 'Journey & highlights', fields: ['seasons', 'topPicks', 'introSlides'], icon: '◷' },
  { id: 'navigation', label: 'Homepage & navigation', fields: ['viewerProfiles', 'sectionMeta', 'siteSettings'], icon: '⌘' },
  { id: 'seo', label: 'SEO & search', fields: ['seo'], icon: '⌕' },
] as const;

type NavId = typeof NAV_ITEMS[number]['id'];
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function titleCase(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function emptyLike(value: any): any {
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, emptyLike(child)]));
  if (typeof value === 'number') return 0;
  if (typeof value === 'boolean') return false;
  if (typeof value === 'string') return '';
  return null;
}

function JsonField({
  name,
  value,
  onChange,
  onRemove,
  depth = 0,
}: {
  name: string;
  value: JsonValue;
  onChange: (next: JsonValue) => void;
  onRemove?: () => void;
  depth?: number;
}) {
  const label = titleCase(name);
  const sharedInput = 'w-full rounded-xl border border-white/10 bg-[#101116] px-3 py-2.5 text-sm text-[#f5f2eb] outline-none transition placeholder:text-white/25 focus:border-[#e34d63] focus:ring-2 focus:ring-[#e34d63]/15';

  if (Array.isArray(value)) {
    return (
      <section className={`rounded-2xl border border-white/10 bg-white/[0.025] p-3 sm:p-4 ${depth > 0 ? 'mt-3' : ''}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-[#f3efe6]">{label}</h4>
            <p className="mt-0.5 text-[11px] text-white/40">{value.length} item{value.length === 1 ? '' : 's'}</p>
          </div>
          <button type="button" onClick={() => onChange([...value, value.length ? emptyLike(value[0]) : ''])} className="rounded-lg border border-[#e34d63]/35 px-3 py-2 text-xs font-semibold text-[#ff8596] transition hover:bg-[#e34d63]/10">
            + Add item
          </button>
        </div>
        <div className="space-y-2">
          {value.map((item, index) => (
            <div key={index} className="relative rounded-xl border border-white/[0.07] bg-black/15 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Item {index + 1}</span>
                <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} className="rounded-md px-2 py-1 text-[11px] text-red-300/70 hover:bg-red-400/10 hover:text-red-200">Remove</button>
              </div>
              <JsonField
                name={typeof item === 'object' && item && 'title' in item ? String((item as any).title || label + ' item') : `Item ${index + 1}`}
                value={item as JsonValue}
                depth={depth + 1}
                onChange={(next) => onChange(value.map((existing, i) => i === index ? next : existing))}
              />
            </div>
          ))}
          {!value.length && <p className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-white/35">No items yet. Use Add item to create one.</p>}
        </div>
      </section>
    );
  }

  if (value !== null && typeof value === 'object') {
    return (
      <details open={depth < 1} className={`rounded-2xl border border-white/10 bg-white/[0.025] p-3 sm:p-4 ${depth > 0 ? 'mt-3' : ''}`}>
        <summary className="cursor-pointer list-none select-none text-sm font-semibold text-[#f3efe6] marker:hidden">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] text-[#ff8596]">⌄</span>
          {label}
          <span className="ml-2 text-[10px] font-normal text-white/35">{Object.keys(value).length} fields</span>
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(value).map(([key, child]) => (
            <div key={key} className={Array.isArray(child) || (child !== null && typeof child === 'object') ? 'sm:col-span-2' : ''}>
              <JsonField
                name={key}
                value={child as JsonValue}
                depth={depth + 1}
                onChange={(next) => onChange({ ...value, [key]: next })}
              />
            </div>
          ))}
        </div>
      </details>
    );
  }

  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-white/55">{label}</label>
      {typeof value === 'boolean' ? (
        <label className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-sm text-white/80">
          <span>{value ? 'Enabled' : 'Disabled'}</span>
          <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#e34d63]" />
        </label>
      ) : typeof value === 'number' ? (
        <input className={sharedInput} type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      ) : typeof value === 'string' && (value.length > 90 || value.includes('\n')) ? (
        <textarea className={sharedInput + ' min-h-24 resize-y leading-relaxed'} value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
      ) : (
        <input className={sharedInput} type="text" value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
      )}
      {onRemove && <button type="button" onClick={onRemove} className="mt-1 text-[10px] text-red-300/60 hover:text-red-200">Remove field</button>}
    </div>
  );
}

function AdminLogin({ onSuccess }: { onSuccess: (user: AdminUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await signInAdmin(email, password);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08090d] px-4 py-12 text-[#f3efe6]">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(227,77,99,.17),transparent_48%)]" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#111319]/95 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e34d63] text-xl font-black text-white">A</div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#ff8596]">Private workspace</p>
            <h1 className="mt-1 font-display text-3xl">Portfolio Control</h1>
          </div>
        </div>
        <p className="mb-7 text-sm leading-relaxed text-white/55">Sign in with the authorized administrator account. This area is not linked from the public website.</p>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-xs leading-relaxed text-red-200">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-semibold text-white/60">Admin email
            <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-[#e34d63]" placeholder="you@example.com" />
          </label>
          <label className="block text-xs font-semibold text-white/60">Password
            <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-[#e34d63]" placeholder="Enter your password" />
          </label>
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e34d63] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#f06c7f] disabled:cursor-wait disabled:opacity-60">
            {busy ? 'Authenticating…' : 'Unlock admin workspace'} <span>→</span>
          </button>
        </form>
        <div className="mt-7 border-t border-white/10 pt-5 text-center text-[11px] text-white/35">Protected by Supabase Auth + database row-level security</div>
      </div>
    </main>
  );
}

function BackendSetup() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08090d] px-4 py-12 text-[#f3efe6]">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#111319] p-7 sm:p-9">
        <p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#ff8596]">Setup required</p>
        <h1 className="mt-3 font-display text-4xl">Connect the admin backend</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/55">The admin interface is included, but this deployment has not been connected to its database yet. Add these public project values to the hosting environment, then redeploy.</p>
        <div className="mt-6 space-y-3">
          <code className="block rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-[#ffb9c2]">VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co</code>
          <code className="block rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-[#ffb9c2]">VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...</code>
        </div>
        <a href="https://github.com/adityaratre/portfolio#secure-admin-and-cms-setup" className="mt-6 inline-flex rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15">Open setup instructions ↗</a>
      </div>
    </main>
  );
}

export default function AdminApp() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<NavId>('overview');
  const [draft, setDraft] = useState<Record<string, any>>(() => getPortfolioData() as unknown as Record<string, any>);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [lastSaved, setLastSaved] = useState('');

  useEffect(() => {
    document.title = 'Private Admin | Aditya Kumar Ratre';
    const robots = document.querySelector('meta[name="robots"]') ?? document.createElement('meta');
    robots.setAttribute('name', 'robots');
    robots.setAttribute('content', 'noindex,nofollow,noarchive');
    if (!robots.parentElement) document.head.appendChild(robots);
    let alive = true;
    getCurrentAdmin().then(async (current) => {
      if (!alive) return;
      if (current) {
        setUser(current);
        try {
          const remote = await loadPublicPortfolioContent();
          if (remote) {
            setPortfolioData(remote);
            setDraft(getPortfolioData() as unknown as Record<string, any>);
          }
        } catch (error) {
          setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not load saved content.' });
        }
      }
      setChecking(false);
    });
    return () => { alive = false; };
  }, []);

  const selected = NAV_ITEMS.find((item) => item.id === tab)!;
  const editableFields = 'fields' in selected ? selected.fields : [];
  const sectionCount = useMemo(() => Object.values(draft.siteSettings?.sectionVisibility ?? {}).filter(Boolean).length, [draft.siteSettings]);

  function updateField(field: string, next: JsonValue) {
    setDraft((current) => ({ ...current, [field]: next }));
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      await savePortfolioContent(draft);
      setPortfolioData(draft);
      setLastSaved(new Date().toLocaleString());
      setNotice({ kind: 'success', text: 'Changes saved. The public portfolio will use the new content on its next load.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to save changes.' });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await signOutAdmin();
    setUser(null);
  }

  if (!backendConfigured) return <BackendSetup />;
  if (checking) {
    return <main className="flex min-h-screen items-center justify-center bg-[#08090d] text-sm text-white/55">Checking secure administrator session…</main>;
  }
  if (!user) return <AdminLogin onSuccess={async (next) => {
    setUser(next);
    try {
      const remote = await loadPublicPortfolioContent();
      if (remote) setPortfolioData(remote);
      setDraft(getPortfolioData() as unknown as Record<string, any>);
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not load content.' });
    }
  }} />;

  const dataCounts = [
    { label: 'Projects', value: draft.projects?.length ?? 0 },
    { label: 'Experience', value: draft.experience?.length ?? 0 },
    { label: 'Certifications', value: draft.certifications?.length ?? 0 },
    { label: 'Visible sections', value: sectionCount },
  ];

  return (
    <div className="min-h-screen bg-[#08090d] text-[#f3efe6]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0d0f14] px-4 py-6 lg:flex lg:flex-col">
          <a href="/" className="mb-8 flex items-center gap-3 px-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e34d63] font-display text-2xl text-white">A</span>
            <span><span className="block text-[9px] font-bold uppercase tracking-[.25em] text-[#ff8596]">Aditya Ratre</span><span className="mt-0.5 block text-sm font-semibold">Control Room</span></span>
          </a>
          <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[.2em] text-white/30">Manage website</p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition ${tab === item.id ? 'bg-[#e34d63]/15 text-[#ff9aaa]' : 'text-white/55 hover:bg-white/[.04] hover:text-white'}`}>
                <span className="w-5 text-center text-base">{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
            <a href="/" className="block rounded-xl border border-white/10 px-3 py-2.5 text-center text-xs text-white/65 hover:bg-white/[.05]">↗ View public website</a>
            <button type="button" onClick={logout} className="w-full rounded-xl px-3 py-2.5 text-xs text-white/45 hover:bg-white/[.05] hover:text-white">Sign out</button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#08090d]/90 px-4 py-4 backdrop-blur-xl sm:px-7 lg:px-10">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[.25em] text-[#ff8596]">Secure content management</p>
              <h1 className="mt-1 truncate text-lg font-semibold sm:text-xl">{selected.label}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden max-w-48 truncate text-[11px] text-white/40 sm:block">{user.email}</span>
              <button type="button" onClick={() => void save()} disabled={busy} className="rounded-xl bg-[#e34d63] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#e34d63]/15 transition hover:bg-[#f06c7f] disabled:opacity-60">{busy ? 'Saving…' : 'Save changes'}</button>
              <button type="button" onClick={logout} className="rounded-xl border border-white/10 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[.05] lg:hidden">Exit</button>
            </div>
            <div className="flex w-full gap-2 overflow-x-auto pb-1 lg:hidden">
              {NAV_ITEMS.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] ${tab === item.id ? 'bg-[#e34d63]/15 text-[#ff9aaa]' : 'bg-white/[.04] text-white/50'}`}>{item.label}</button>)}
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
            {notice && <div role="status" className={`mb-6 rounded-xl border px-4 py-3 text-xs ${notice.kind === 'success' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-red-400/20 bg-red-400/10 text-red-200'}`}>{notice.text}</div>}
            {tab === 'overview' ? (
              <>
                <div className="mb-8">
                  <p className="text-sm text-white/45">Welcome back, {user.email}. Your portfolio content is ready to manage.</p>
                  <h2 className="mt-2 font-display text-4xl sm:text-5xl">Your website, your control.</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {dataCounts.map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><p className="text-xs text-white/45">{item.label}</p><p className="mt-2 font-display text-4xl text-[#ff8596]">{item.value}</p></div>)}
                </div>
                <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#ff8596]">Content studio</p>
                    <h3 className="mt-3 text-xl font-semibold">Update without touching code</h3>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">Edit profile information, education, work, projects, skills, certificates, journey cards, navigation labels, visibility controls and search metadata. Save publishes the new content for visitors.</p>
                    <button type="button" onClick={() => setTab('profile')} className="mt-5 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold hover:bg-white/[.06]">Edit profile details →</button>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[.22em] text-white/35">Publishing</p>
                    <p className="mt-3 text-sm text-white/60">Last saved</p>
                    <p className="mt-1 text-sm font-semibold">{lastSaved || 'No changes saved in this session'}</p>
                    <p className="mt-5 text-xs leading-relaxed text-white/40">Changes are stored in the secure portfolio database. Keep your admin password private and do not share project secret keys.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 max-w-3xl">
                  <p className="text-xs leading-relaxed text-white/45">
                    {tab === 'seo'
                      ? 'Manage the title, description, search topics, canonical URL and social preview used for your portfolio.'
                      : 'Edit fields directly. Use Add item to create new records and Remove to delete an entry. Nested objects can be expanded to edit each field.'}
                  </p>
                </div>
                <div className="space-y-4">
                  {editableFields.map((field) => (
                    <JsonField
                      key={field}
                      name={field}
                      value={(draft[field] ?? (Array.isArray(getPortfolioData()[field as keyof ReturnType<typeof getPortfolioData>]) ? [] : {})) as JsonValue}
                      onChange={(next) => updateField(field, next)}
                    />
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                  <p className="text-[11px] text-white/35">Changes stay in this editor until you select Save changes.</p>
                  <button type="button" onClick={() => void save()} disabled={busy} className="rounded-xl bg-[#e34d63] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#f06c7f] disabled:opacity-60">{busy ? 'Saving…' : 'Save this section'}</button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
