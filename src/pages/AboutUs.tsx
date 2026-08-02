import { Link } from "react-router-dom";
import MarketingPageShell from "@/components/MarketingPageShell";

const values = [
  {
    title: "Verification before velocity",
    text: "We would rather slow a listing down than rush an unverified property into someone’s next major life decision.",
  },
  {
    title: "Local trust over generic scale",
    text: "NaijaStays is growing city by city, starting with Port Harcourt, so each area feels personally understood instead of loosely covered.",
  },
  {
    title: "Clarity at every step",
    text: "From short lets to land purchases, we believe the right information should be easier to find than the sales pitch.",
  },
];

const milestones = [
  "Built to make buying, renting, and short-let decisions feel less risky for everyday Nigerians.",
  "Focused first on trusted growth in Port Harcourt and Rivers State before expanding into more cities.",
  "Designed around verified listings, responsive agents, and a calmer experience from first click to final decision.",
];

export default function AboutUs() {
  return (
    <MarketingPageShell
      eyebrow="Company"
      title="We’re building a calmer way to find property in Nigeria."
      description="NaijaStays exists to make property discovery feel more human, more transparent, and more trustworthy. We want every renter, buyer, and host to feel like they have a local team helping them make a confident move."
      action={
        <div className="space-y-4">
          <p className="text-sm font-semibold text-foreground">Why people stay with us</p>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-2xl bg-secondary/70 p-4">Verified listings instead of guesswork.</div>
            <div className="rounded-2xl bg-secondary/70 p-4">Real local context from Port Harcourt outward.</div>
            <div className="rounded-2xl bg-secondary/70 p-4">A platform shaped for renting, buying, and short lets in one place.</div>
          </div>
        </div>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[30px] border border-primary/10 bg-card p-8 shadow-[0_24px_55px_-42px_rgba(21,128,61,0.45)]">
          <h2 className="font-display text-3xl font-semibold text-foreground">Our story so far</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            The property journey can feel noisy, rushed, and uncertain. We started NaijaStays to create a more grounded experience: one where quality beats clutter, local knowledge beats vague claims, and every step feels easier to trust.
          </p>
          <div className="mt-6 grid gap-4">
            {milestones.map((milestone) => (
              <div key={milestone} className="rounded-2xl border border-primary/10 bg-secondary/45 p-4 text-sm leading-7 text-foreground">
                {milestone}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-primary/10 bg-[#123221] p-8 text-card shadow-[0_24px_55px_-42px_rgba(12,38,24,0.9)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-card/60">Mission</p>
          <h2 className="mt-4 font-display text-3xl font-semibold">To make trusted property moves feel possible for more people.</h2>
          <p className="mt-4 text-sm leading-7 text-card/75">
            Whether someone is booking a short let for a week, searching for a family rental, or preparing to buy land, we want the process to feel clearer from the first search to the final conversation.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        {values.map((value) => (
          <div key={value.title} className="rounded-[26px] border border-primary/10 bg-card p-6 shadow-[0_24px_55px_-42px_rgba(21,128,61,0.3)]">
            <h3 className="font-display text-2xl font-semibold text-foreground">{value.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{value.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-[30px] border border-primary/10 bg-[linear-gradient(135deg,rgba(20,83,45,0.96),rgba(34,197,94,0.88))] p-8 text-card shadow-[0_24px_55px_-42px_rgba(21,128,61,0.55)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold">See how that shows up in our listings.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-card/80">
              Browse homes, rentals, short lets, and land opportunities with the same steady, trust-first approach across every category.
            </p>
          </div>
          <Link
            to={{ pathname: "/", hash: "#listings" }}
            className="inline-flex items-center justify-center rounded-full bg-card px-5 py-3 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02]"
          >
            Explore listings
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}
