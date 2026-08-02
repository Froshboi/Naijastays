import { Link } from "react-router-dom";
import MarketingPageShell from "@/components/MarketingPageShell";

const featuredPost = {
  category: "Buying Guide",
  title: "Before you pay for land in Rivers State, verify these five things first.",
  excerpt:
    "Land can look perfect online and still hide real issues offline. This guide walks buyers through the checks that matter most before money changes hands.",
};

const posts = [
  {
    category: "Neighbourhood Guide",
    title: "4 Port Harcourt areas renters keep asking about right now",
    excerpt:
      "From Old GRA to Woji, here is what people usually want to know before choosing where to live.",
  },
  {
    category: "Short Let",
    title: "How to book a short let without getting surprised later",
    excerpt:
      "The simple questions that protect your budget, your timeline, and your peace of mind before arrival day.",
  },
  {
    category: "Home Search",
    title: "What a genuinely helpful property listing should tell you upfront",
    excerpt:
      "Transparent pricing, real photos, and clear area context go a lot further than hype-heavy descriptions.",
  },
  {
    category: "Market Notes",
    title: "Why trusted local context matters more than endless listing volume",
    excerpt:
      "A smaller, more reliable property experience can save people more time than a giant feed full of uncertainty.",
  },
];

export default function Blog() {
  return (
    <MarketingPageShell
      eyebrow="Blog"
      title="Practical reads for renters, buyers, hosts, and curious property people."
      description="This is a strong starter blog page with engaging placeholder content you can edit later. It already gives the brand a voice, helps the footer feel complete, and creates room for future SEO or content marketing when you’re ready."
      action={
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Featured now</p>
          <div className="rounded-2xl bg-secondary/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">{featuredPost.category}</p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-foreground">{featuredPost.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{featuredPost.excerpt}</p>
          </div>
        </div>
      }
    >
      <section className="grid gap-6 md:grid-cols-2">
        {posts.map((post) => (
          <article
            key={post.title}
            className="rounded-[30px] border border-primary/10 bg-card p-7 shadow-[0_24px_55px_-42px_rgba(21,128,61,0.35)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">{post.category}</p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-foreground">{post.title}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{post.excerpt}</p>
            <div className="mt-6 text-sm font-semibold text-primary">Draft article placeholder</div>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-[30px] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.92))] p-8 shadow-[0_24px_55px_-42px_rgba(21,128,61,0.32)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_auto] lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold text-foreground">Turn advice into action.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Once a reader finds a post that speaks to their need, they should be able to move straight into relevant listings without friction.
            </p>
          </div>
          <Link
            to={{ pathname: "/", hash: "#listings" }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Browse properties
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}
