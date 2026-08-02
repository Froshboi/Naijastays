import { Link } from "react-router-dom";
import MarketingPageShell from "@/components/MarketingPageShell";

const agents = [
  {
    name: "Emeka Okafor",
    title: "Senior Property Consultant",
    focus: "Luxury homes and family-ready duplexes",
  },
  {
    name: "Chioma Eze",
    title: "Luxury Property Specialist",
    focus: "Serviced apartments and executive rentals",
  },
  {
    name: "Ngozi Okonkwo",
    title: "Short Let Specialist",
    focus: "Premium stays for business and leisure trips",
  },
  {
    name: "Adaeze Nwosu",
    title: "Commercial Property Director",
    focus: "Land opportunities and investment-led decisions",
  },
];

const standards = [
  "Local area knowledge that goes beyond generic listing talk.",
  "Clear, timely communication from first inquiry to final inspection.",
  "Verification habits that protect renters, buyers, and hosts alike.",
];

export default function Agents() {
  return (
    <MarketingPageShell
      eyebrow="Our Agents"
      title="Trusted people make trusted property moves possible."
      description="Our agents are presented as calm guides, not pushy middlemen. They help buyers, renters, and short-let guests move faster with better information, clearer expectations, and stronger local context."
      action={
        <div className="space-y-4">
          <p className="text-sm font-semibold text-foreground">What we expect from every agent</p>
          <div className="grid gap-3">
            {standards.map((item) => (
              <div key={item} className="rounded-2xl bg-secondary/70 p-4 text-sm leading-7 text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      }
    >
      <section className="grid gap-6 md:grid-cols-2">
        {agents.map((agent) => (
          <article
            key={agent.name}
            className="rounded-[30px] border border-primary/10 bg-card p-7 shadow-[0_24px_55px_-42px_rgba(21,128,61,0.35)]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
              {agent.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
            <h2 className="mt-5 font-display text-3xl font-semibold text-foreground">{agent.name}</h2>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary/75">{agent.title}</p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{agent.focus}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-[30px] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.92))] p-8 shadow-[0_24px_55px_-42px_rgba(21,128,61,0.32)]">
        <h2 className="font-display text-3xl font-semibold text-foreground">How our agents should make you feel</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-primary/10 bg-card p-5 text-sm leading-7 text-muted-foreground">
            Heard when you ask practical questions.
          </div>
          <div className="rounded-2xl border border-primary/10 bg-card p-5 text-sm leading-7 text-muted-foreground">
            Informed enough to compare options confidently.
          </div>
          <div className="rounded-2xl border border-primary/10 bg-card p-5 text-sm leading-7 text-muted-foreground">
            Unpressured while making a serious decision.
          </div>
        </div>
      </section>

      <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[30px] border border-primary/10 bg-[#123221] p-8 text-card shadow-[0_24px_55px_-42px_rgba(12,38,24,0.9)]">
        <div>
          <h2 className="font-display text-3xl font-semibold">Ready to browse properties with that standard?</h2>
          <p className="mt-3 text-sm leading-7 text-card/75">
            Jump into the listing feed and start with verified homes, rentals, short lets, and land opportunities.
          </p>
        </div>
        <Link
          to={{ pathname: "/", hash: "#listings" }}
          className="inline-flex items-center justify-center rounded-full bg-card px-5 py-3 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02]"
        >
          Browse listings
        </Link>
      </section>
    </MarketingPageShell>
  );
}
