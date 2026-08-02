import MarketingPageShell from "@/components/MarketingPageShell";

const teamNeeds = [
  "Field verifiers who notice the details others skip.",
  "Operations-minded people who enjoy bringing order to moving parts.",
  "Content and brand storytellers who can make complex property decisions feel simple.",
];

export default function Careers() {
  return (
    <MarketingPageShell
      eyebrow="Careers"
      title="We’re not actively hiring right now, but we are definitely building."
      description="A careers page is not mandatory at this stage, but having one gives you a clean, credible destination for future opportunities. For now, this page sets the tone and makes it easy to update later when roles open up."
      action={
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Current status</p>
          <div className="rounded-2xl bg-secondary/70 p-4 text-sm leading-7 text-muted-foreground">
            No open roles are listed today. You can update this section later with active positions, hiring timelines, or a simple contact route for interest.
          </div>
        </div>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[30px] border border-primary/10 bg-card p-8 shadow-[0_24px_55px_-42px_rgba(21,128,61,0.32)]">
          <h2 className="font-display text-3xl font-semibold text-foreground">What kind of team are we shaping?</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            NaijaStays works best when the team cares deeply about trust, speed with judgment, and thoughtful service. As you grow, this page can become the place where you describe how the team works and what kind of builders fit naturally into that culture.
          </p>
        </div>

        <div className="rounded-[30px] border border-primary/10 bg-[#123221] p-8 text-card shadow-[0_24px_55px_-42px_rgba(12,38,24,0.85)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-card/60">Future roles we can imagine</p>
          <div className="mt-5 grid gap-4">
            {teamNeeds.map((item) => (
              <div key={item} className="rounded-2xl bg-white/8 p-4 text-sm leading-7 text-card/80">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[30px] border border-dashed border-primary/20 bg-secondary/45 p-8">
        <h2 className="font-display text-3xl font-semibold text-foreground">Why keep this page live anyway?</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-card p-5 text-sm leading-7 text-muted-foreground shadow-[0_18px_40px_-34px_rgba(21,128,61,0.35)]">
            It makes the brand feel more complete and intentional.
          </div>
          <div className="rounded-2xl bg-card p-5 text-sm leading-7 text-muted-foreground shadow-[0_18px_40px_-34px_rgba(21,128,61,0.35)]">
            It gives future applicants a destination instead of a dead link.
          </div>
          <div className="rounded-2xl bg-card p-5 text-sm leading-7 text-muted-foreground shadow-[0_18px_40px_-34px_rgba(21,128,61,0.35)]">
            It is easy to swap this placeholder into real openings later.
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
