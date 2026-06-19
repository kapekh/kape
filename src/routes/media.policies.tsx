import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, MediaPlaceholder } from "@/components/SubPage";

export const Route = createFileRoute("/media/policies")({
  head: () => ({
    meta: [
      { title: "Policies & Regulations — KAPE" },
      { name: "description", content: "KAPE's organizational policies and regulations." },
    ],
  }),
  component: () => (
    <SubPage section="Media & Publications" title="Policies and Regulations" lead="Our organizational policies, codes and safeguarding standards." badge="Governance">
      <Section title="Key documents">
        <div className="grid md:grid-cols-2 gap-3">
          {["Child Safeguarding Policy", "Code of Conduct", "Anti-Fraud Policy", "Procurement Manual", "Data Protection Policy", "Whistleblower Policy"].map((t) => (
            <MediaPlaceholder key={t} kind="pdf" title={t} />
          ))}
        </div>
      </Section>
    </SubPage>
  ),
});