import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, MediaPlaceholder } from "@/components/SubPage";

export const Route = createFileRoute("/media/e-newsletter")({
  head: () => ({
    meta: [
      { title: "E-Newsletter — KAPE" },
      { name: "description", content: "Quarterly e-newsletters from KAPE." },
    ],
  }),
  component: () => (
    <SubPage section="Media & Publications" title="E-Newsletter" lead="Quarterly stories, milestones and project updates — delivered to your inbox." badge="Stay in touch">
      <Section title="Subscribe">
        <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
          <input type="email" required placeholder="you@example.com" className="flex-1 rounded-full border border-border bg-background px-5 py-3 text-sm" />
          <button type="submit" className="rounded-full bg-[var(--accent)] text-accent-foreground px-6 py-3 text-sm font-semibold shadow-[var(--shadow-lift)]">Subscribe</button>
        </form>
      </Section>
      <Section title="Recent issues">
        <div className="grid md:grid-cols-2 gap-3">
          {["Q1 2026", "Q4 2025", "Q3 2025", "Q2 2025"].map((q) => (
            <MediaPlaceholder key={q} kind="pdf" title={`KAPE Newsletter — ${q}`} meta="8 pages · 1.4 MB" />
          ))}
        </div>
      </Section>
    </SubPage>
  ),
});