import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, Grid, Card } from "@/components/SubPage";

export const Route = createFileRoute("/opportunities/alumni")({
  head: () => ({
    meta: [
      { title: "Alumni Network — KAPE" },
      { name: "description", content: "KAPE alumni community — staying connected with former staff, students and partners." },
    ],
  }),
  component: () => (
    <SubPage section="Opportunities" title="Alumni Network" lead="Reconnect with the KAPE community — former scholarship recipients, NGS graduates and staff." badge="Stay connected">
      <Section title="Why join">
        <Grid cols={3}>
          <Card title="Mentor a student" accent>Share your career journey with the next generation.</Card>
          <Card title="Annual reunion" accent>Yearly gathering in Kampong Cham — open to all alumni.</Card>
          <Card title="Job board" accent>First access to roles at KAPE and partner organizations.</Card>
        </Grid>
      </Section>
      <Section title="Register">
        <form className="grid sm:grid-cols-2 gap-3" onSubmit={(e) => e.preventDefault()}>
          <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="Full name" />
          <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="Graduation year" />
          <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm sm:col-span-2" placeholder="Email" />
          <button className="rounded-xl bg-[var(--accent)] text-accent-foreground px-5 py-3 text-sm font-semibold sm:col-span-2">Join the network</button>
        </form>
      </Section>
    </SubPage>
  ),
});