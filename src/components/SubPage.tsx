import type { ReactNode } from "react";

import students from "@/assets/students.jpg.asset.json";
import { useLang } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";
import { NavLink } from "@/components/NavLink";

type Crumb = { label: string; href?: string };

export function SubPage({
  section,
  title,
  lead,
  heroImage,
  badge,
  crumbs,
  wide = false,
  children,
}: {
  section: string;
  title: string;
  lead?: string;
  heroImage?: string;
  badge?: string;
  crumbs?: Crumb[];
  /** Full-width body (max-w-7xl, no single card) for layouts that supply their
   *  own cards/columns. Default is the narrow article card (max-w-4xl). */
  wide?: boolean;
  children: ReactNode;
}) {
  const bg = heroImage ?? students.url;
  const { lang, t } = useLang();
  return (
    <main className="min-h-screen text-foreground overflow-x-hidden">
      {/* Hero */}
      <section className="relative pt-28 pb-28 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={bg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/75 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_35%,rgba(0,0,0,0.25))]" />
        </div>
        <div className="mx-auto max-w-7xl text-primary-foreground">
          <nav className="flex flex-wrap items-center gap-2 text-xs opacity-85">
            <NavLink href={localizedHref("/", lang)} className="hover:underline">{t("nav.home", "Home")}</NavLink>
            <span aria-hidden>/</span>
            <span>{section}</span>
            {crumbs?.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                <span aria-hidden>/</span>
                {c.href ? (
                  <NavLink href={localizedHref(c.href, lang)} className="hover:underline">{c.label}</NavLink>
                ) : (
                  <span>{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          {badge && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gold)] backdrop-blur">
              {badge}
            </div>
          )}
          <h1 className="mt-5 max-w-4xl t-page-title [text-shadow:0_2px_24px_rgba(0,0,0,0.3)]">{title}</h1>
          {lead && (
            <p className="mt-5 max-w-3xl t-lead text-primary-foreground/90">{lead}</p>
          )}
        </div>
      </section>

      {/* Body — pulled up to overlap the hero for a layered, polished feel. */}
      <section className="px-6 pb-24 -mt-16">
        <div className={`mx-auto ${wide ? "max-w-7xl" : "max-w-4xl"}`}>
          {wide ? (
            // Caller supplies its own cards/columns across the full frame.
            children
          ) : (
            // Caller supplies its own `prose-kape` wrapper for rich text; we don't
            // force it here so non-prose children (e.g. the album photo grid) stay clean.
            <div className="rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-8 md:p-12">
              {children}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/* Reusable building blocks */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="t-subsection text-primary">{title}</h2>
      <div className="mt-4 space-y-4 text-foreground/85 leading-relaxed">{children}</div>
    </section>
  );
}

export function Card({
  title,
  children,
  accent = false,
}: {
  title?: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        accent
          ? "border-[var(--accent)]/30 bg-[var(--accent)]/5"
          : "border-border bg-background/40"
      }`}
    >
      {title && <h3 className="font-display text-lg font-semibold text-primary mb-2">{title}</h3>}
      <div className="text-sm text-foreground/80 leading-relaxed">{children}</div>
    </div>
  );
}

export function Grid({
  cols = 3,
  children,
}: {
  cols?: 2 | 3 | 4;
  children: ReactNode;
}) {
  const c =
    cols === 2
      ? "md:grid-cols-2"
      : cols === 4
      ? "md:grid-cols-2 lg:grid-cols-4"
      : "md:grid-cols-2 lg:grid-cols-3";
  return <div className={`mt-6 grid grid-cols-1 ${c} gap-4`}>{children}</div>;
}

export function MediaPlaceholder({
  kind,
  title,
  meta,
}: {
  kind: "pdf" | "video" | "image";
  title: string;
  meta?: string;
}) {
  const icon = kind === "pdf" ? "📄" : kind === "video" ? "▶" : "🖼";
  const label = kind === "pdf" ? "PDF" : kind === "video" ? "Video" : "Image";
  return (
    <a
      href="#"
      className="group flex items-start gap-4 rounded-2xl border border-border bg-background/40 p-4 hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition"
    >
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[var(--secondary)]/15 text-xl text-[var(--secondary)]">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] font-semibold">
          {label}
        </div>
        <div className="mt-0.5 font-medium text-foreground group-hover:text-[var(--accent)] transition">
          {title}
        </div>
        {meta && <div className="text-xs text-muted-foreground mt-1">{meta}</div>}
      </div>
    </a>
  );
}