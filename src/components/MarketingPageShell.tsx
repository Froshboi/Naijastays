import { ReactNode } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface MarketingPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function MarketingPageShell({
  eyebrow,
  title,
  description,
  action,
  children,
}: MarketingPageShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar onSearch={() => {}} />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(236,253,245,0.88))]">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_65%)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
            <Link
              to="/"
              className="inline-flex items-center rounded-full border border-primary/15 bg-card/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Back to home
            </Link>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/75">{eyebrow}</p>
                <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
                  {title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                  {description}
                </p>
              </div>

              {action ? (
                <div className="rounded-[28px] border border-primary/10 bg-card/90 p-6 shadow-[0_24px_55px_-38px_rgba(21,128,61,0.52)]">
                  {action}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">{children}</div>
      </main>

      <Footer />
    </div>
  );
}
