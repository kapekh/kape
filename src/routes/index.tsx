import { createFileRoute } from "@tanstack/react-router";
import students from "@/assets/students.jpg.asset.json";
import conference from "@/assets/conference.jpg.asset.json";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

type Slide = { id: number; url: string; kicker: string; title: string; caption: string };

export const Route = createFileRoute("/")({
  loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
  loader: async ({ context, deps }) => {
    const o = context.trpc;
    const [news, stories, stats, hero, announcement, videos] = await Promise.all([
      context.queryClient.ensureQueryData(o.posts.list.queryOptions({ type: "news", lang: deps.lang, limit: 3 })),
      context.queryClient.ensureQueryData(o.posts.list.queryOptions({ type: "story", lang: deps.lang, limit: 3 })),
      context.queryClient.ensureQueryData(o.site.stats.queryOptions({ lang: deps.lang })),
      context.queryClient.ensureQueryData(o.site.heroSlides.queryOptions({ lang: deps.lang })),
      context.queryClient.ensureQueryData(o.site.announcement.queryOptions({ lang: deps.lang })),
      context.queryClient.ensureQueryData(o.posts.videos.queryOptions({ lang: deps.lang })),
    ]);
    return { news, stories, stats, hero, announcement, videos };
  },
  head: () => ({
    meta: [
      { title: "KAPE — Kampuchea Action to Promote Education" },
      { name: "description", content: "For more than three decades, KAPE has championed equitable, transformative education for Cambodian children — across 385+ schools, 15 provinces, and over 160,000 lives." },
      { property: "og:title", content: "KAPE — Three Decades of Educational Transformation in Cambodia" },
      { property: "og:description", content: "A local non-profit working in formal education across 15 provinces — empowering children, teachers and communities." },
      { property: "og:image", content: students.url },
    ],
  }),
  component: Index,
});

function useCount(target: number, duration = 1800) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

function Stat({ n, label }: { n: number; label: string }) {
  const v = useCount(n);
  return (
    <div className="group relative">
      <div className="text-5xl md:text-6xl font-display font-semibold text-[var(--secondary)] tabular-nums tracking-tight font-serif">
        {v.toLocaleString()}
      </div>
      <div className="mt-2 text-sm uppercase tracking-[0.18em] text-primary-foreground/70">
        {label}
      </div>
      <div className="mt-4 h-px w-12 bg-[var(--secondary)]/60 transition-all duration-500 group-hover:w-24" />
    </div>
  );
}

function HeroSlideshow({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || slides.length === 0) return;
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  const SLIDES = slides;

  return (
    <div
      className="lg:col-span-6 relative h-[520px] md:h-[600px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-[var(--shadow-lift)] ring-1 ring-border">
        {SLIDES.map((s, idx) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-all duration-[1400ms] ease-out ${
              idx === i ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
            aria-hidden={idx !== i}
          >
            <img src={s.url} alt={s.caption} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-7 md:p-9 text-primary-foreground">
              <div className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[var(--gold)]">
                {s.kicker}
              </div>
              <h3 className="mt-2 font-display text-2xl md:text-3xl font-semibold leading-tight max-w-md">
                {s.title}
              </h3>
              <p className="mt-2 text-sm opacity-90">{s.caption}</p>
            </div>
          </div>
        ))}

        {/* Progress bars */}
        <div className="absolute top-5 left-5 right-5 flex gap-1.5 z-10">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className="group relative h-1 flex-1 rounded-full bg-white/30 overflow-hidden"
              aria-label={`Go to slide ${idx + 1}`}
            >
              <span
                className={`absolute inset-y-0 left-0 bg-white ${
                  idx === i && !paused
                    ? "animate-[slide-progress_4.5s_linear_forwards]"
                    : idx < i
                    ? "w-full"
                    : "w-0"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Arrows */}
        <button
          onClick={() => setI((p) => (p - 1 + SLIDES.length) % SLIDES.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/85 backdrop-blur grid place-items-center text-primary shadow-[var(--shadow-soft)] hover:bg-background transition opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
          aria-label="Previous slide"
        >
          ‹
        </button>
        <button
          onClick={() => setI((p) => (p + 1) % SLIDES.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/85 backdrop-blur grid place-items-center text-primary shadow-[var(--shadow-soft)] hover:bg-background transition"
          aria-label="Next slide"
        >
          ›
        </button>
      </div>

      {/* decorative */}
      <div className="absolute -top-6 -left-6 h-32 w-32 rounded-full bg-[var(--gold)]/40 blur-3xl -z-10" />
      <div className="absolute -bottom-6 -right-6 h-40 w-40 rounded-full bg-[var(--accent)]/30 blur-3xl -z-10" />
    </div>
  );
}

function Index() {
  const [popupOpen, setPopupOpen] = useState(true);
  const { t, lang } = useLang();
  const { news, stories, stats, hero, announcement, videos } = Route.useLoaderData();
  const q = lang && lang !== "en" ? `?lang=${lang}` : "";

  return (
    <main className="min-h-screen text-foreground overflow-x-hidden">

      {/* Announcement popup (from DB; deadline-driven, else evergreen message) */}
      {popupOpen && announcement && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] p-5 animate-[fade-up_0.6s_ease-out]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] font-semibold mb-1">
                {announcement.hasDeadline ? "Announcement" : "KAPE"}
              </div>
              <h4 className="font-display font-semibold text-base leading-tight text-primary">{announcement.title}</h4>
              {announcement.message && <p className="text-xs text-muted-foreground mt-1.5">{announcement.message}</p>}
              {announcement.deadline && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/20 px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.12_80)]">
                  ⏳ Deadline {announcement.deadline}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPopupOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {announcement.linkUrl && (
            <a href={`${announcement.linkUrl}${q}`} className="mt-3 inline-block text-xs font-semibold text-primary underline underline-offset-4">Read more →</a>
          )}
        </div>
      )}

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/5 px-4 py-1.5 text-xs font-medium text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              {t("home.badge")}
            </div>
            <h1 className="mt-6 font-display font-semibold text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-primary">
              {t("home.hero.1")}{" "}
              <span className="italic text-[var(--accent)]">{t("home.hero.learns")}</span>{" "}
              {t("home.hero.dreams")}{" "}
              <span className="relative inline-block">
                <span className="relative z-10">{t("home.hero.rises")}</span>
                <span className="absolute inset-x-0 bottom-1 h-3 bg-[var(--gold)]/60 -z-0" />
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              {t("home.hero.lead")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#impact" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition">
                {t("home.cta.stories")}
              </a>
              <a href="#about" className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition">
                {t("home.cta.who")}
              </a>
            </div>

            <div className="mt-12 flex items-center gap-6 text-xs text-muted-foreground">
              <div>
                <div className="font-display font-semibold text-2xl text-primary">385+</div>
                {t("home.stat.schools")}
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <div className="font-display font-semibold text-2xl text-primary">15</div>
                {t("home.stat.provinces")}
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <div className="font-display font-semibold text-2xl text-primary">160K+</div>
                {t("home.stat.children")}
              </div>
            </div>
          </div>

          {/* Slideshow banner */}
          <HeroSlideshow slides={hero} />
        </div>
      </section>

      {/* LATEST NEWS */}
      <section className="bg-card border-y border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--accent)] font-semibold">Stories from the field</div>
              <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-primary max-w-2xl leading-[1.05]">
                Latest news <span className="italic text-[var(--secondary)]">&</span> events
              </h2>
            </div>
            <a href={`/who-we-are/news${q}`} className="text-sm font-semibold text-primary underline underline-offset-8 hover:text-[var(--accent)]">{t("home.news.all")}</a>
          </div>

          {news.length === 0 ? (
            <p className="text-muted-foreground">No news yet.</p>
          ) : (
            <div className="grid lg:grid-cols-12 gap-8">
              {/* Featured */}
              <a href={`/who-we-are/news/${news[0].slug}${q}`} className="lg:col-span-7 group block">
                <div className="relative h-[420px] rounded-3xl overflow-hidden ring-1 ring-border bg-gradient-to-br from-[var(--secondary)]/40 to-[var(--accent)]/25">
                  <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
                  <div className="absolute bottom-0 p-8 text-primary-foreground">
                    <span className="text-[10px] uppercase tracking-[0.25em] bg-[var(--accent)] px-3 py-1 rounded-full font-semibold">News · {news[0].publishedAt}</span>
                    <h3 className="mt-4 font-display text-3xl md:text-4xl font-semibold leading-tight max-w-xl">{news[0].title}</h3>
                    <p className="mt-3 text-sm opacity-90 max-w-lg">{news[0].excerpt}</p>
                    <span className="mt-5 inline-block text-sm font-semibold text-[var(--gold)]">{t("home.news.readmore")}</span>
                  </div>
                </div>
              </a>

              <div className="lg:col-span-5 space-y-6">
                {news.slice(1).map((n) => (
                  <a key={n.id} href={`/who-we-are/news/${n.slug}${q}`} className="flex gap-5 group">
                    <div className="relative h-32 w-40 flex-shrink-0 rounded-2xl overflow-hidden ring-1 ring-border bg-gradient-to-br from-[var(--secondary)]/30 to-[var(--accent)]/20" />
                    <div className="flex-1">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">News · {n.publishedAt}</div>
                      <h4 className="mt-1.5 font-display text-lg font-semibold leading-tight text-primary group-hover:text-[var(--accent)] transition">{n.title}</h4>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{n.excerpt}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* IMPACT STORIES */}
      <section id="impact" className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--accent)] font-semibold">Lives transformed</div>
            <h2 className="mt-3 font-display text-4xl md:text-6xl font-semibold text-primary leading-[1.02]">
              Impact <span className="italic text-[var(--secondary)]">stories</span>
            </h2>
            <p className="mt-5 text-muted-foreground text-lg">
              Behind every statistic is a child, a teacher, a community whose lives changed because someone believed in them.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {stories.map((s, i) => (
              <a
                key={s.id}
                href={`/what-we-do/impact-stories/${s.slug}${q}`}
                className="group relative bg-card rounded-3xl overflow-hidden ring-1 ring-border shadow-sm hover:shadow-[var(--shadow-soft)] transition-all duration-500 hover:-translate-y-2 block"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-[var(--secondary)]/30 to-[var(--accent)]/20">
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                </div>
                <div className="p-7">
                  <div className="text-5xl font-display text-[var(--accent)] leading-none mb-2">"</div>
                  <h3 className="font-display text-lg font-semibold leading-snug text-[var(--accent)]">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/85">{s.excerpt}</p>
                  <span className="mt-4 inline-block text-xs font-semibold text-primary group-hover:text-[var(--accent)]">{t("home.impact.readfull")}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* VIDEOS */}
      <section className="bg-muted/40 border-y border-border py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--accent)] font-semibold">Watch</div>
              <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-primary">From the classroom</h2>
            </div>
            <a href={`/media/video-gallery${q}`} className="text-sm font-semibold text-primary underline underline-offset-8">{t("home.video.all")}</a>
          </div>
          {videos.length === 0 ? (
            <p className="text-muted-foreground">No videos yet.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {videos.slice(0, 3).map((v) => (
                <a key={v.id} href={v.youtubeUrl || "#"} target="_blank" rel="noopener noreferrer" className="group">
                  <div className="relative aspect-video rounded-2xl overflow-hidden ring-1 ring-border bg-gradient-to-br from-[var(--secondary)]/30 to-[var(--accent)]/20">
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="h-16 w-16 rounded-full bg-background/95 grid place-items-center shadow-[var(--shadow-lift)] group-hover:scale-110 transition">
                        <div className="ml-1 w-0 h-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-[var(--accent)]" />
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-primary group-hover:text-[var(--accent)] transition">{v.title}</h3>
                  <span className="mt-1 inline-block text-xs font-semibold text-muted-foreground">{t("home.video.more")}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* STATS — dark band */}
      <section className="relative py-24 text-primary-foreground overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: `url(${conference.url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-primary/70" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="max-w-3xl mb-16">
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--gold)] font-semibold">Our reach</div>
            <h2 className="mt-3 font-display text-4xl md:text-6xl font-semibold leading-[1.02]">
              Three decades.<br />
              <span className="italic text-[var(--secondary)]">Countless beginnings.</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-10">
            {stats.map((s) => <Stat key={s.id} n={s.value} label={s.label} />)}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24">
        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="rounded-3xl overflow-hidden ring-1 ring-border shadow-[var(--shadow-soft)]">
                <img src={conference.url} alt="KAPE leadership and partners" className="w-full h-[480px] object-cover" />
              </div>
              <div className="absolute -bottom-8 -right-6 bg-card rounded-2xl p-6 shadow-[var(--shadow-lift)] ring-1 ring-border max-w-[220px]">
                <div className="text-4xl font-display font-semibold text-[var(--accent)]">15</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Provinces<br />of Cambodia</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--accent)] font-semibold">About KAPE</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-primary leading-tight">
              A local NGO with a <span className="italic">national</span> heartbeat for education.
            </h2>
            <p className="mt-6 text-lg text-foreground/80 leading-relaxed">
              KAPE is a local non-profit working primarily in the formal education sector across 15 provinces in Cambodia. We implement projects at every level of the learning journey — from preschools and primary classrooms to secondary schools, tertiary programs and a Master's Degree in Mentoring.
            </p>
            <p className="mt-4 text-foreground/70 leading-relaxed">
              Direct beneficiaries number well over <strong>160,372 children</strong> and several hundred teachers, at more than <strong>385 schools</strong>. Together with partners, we build the conditions for every child to thrive.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {[
                ["Annual Report", "Read our latest year in review"],
                ["Project Impact", "Evidence from the field"],
                ["Research Papers", "Academic publications"],
                ["Photo Gallery", "Faces and moments"],
              ].map(([t, s]) => (
                <a key={t} href="#" className="group p-4 rounded-2xl border border-border hover:border-[var(--accent)] hover:bg-card transition">
                  <div className="font-display font-semibold text-primary group-hover:text-[var(--accent)] transition">{t} →</div>
                  <div className="text-xs text-muted-foreground mt-1">{s}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DONATE CTA */}
      <section id="donate" className="relative py-24 overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-[var(--gold)]/40 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-primary/80 font-bold">Stand with us</div>
          <h2 className="mt-4 font-display text-5xl md:text-7xl font-semibold text-primary leading-[1.02]">
            Be part of the<br />
            <span className="italic">next chapter.</span>
          </h2>
          <p className="mt-6 text-lg text-primary/85 max-w-2xl mx-auto">
            Your gift becomes a textbook, a teacher's training, a girl's scholarship, a community's library. Every contribution writes a future.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <a href="#" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-8 py-4 text-base font-semibold shadow-[var(--shadow-lift)] hover:-translate-y-1 transition">
              ♡ Donate now
            </a>
            <a href="#" className="inline-flex items-center gap-2 rounded-full border-2 border-primary/40 text-primary px-8 py-4 text-base font-semibold hover:bg-primary hover:text-primary-foreground transition">
              Partner with KAPE
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
