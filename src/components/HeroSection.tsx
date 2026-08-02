import { MapPin, Search } from "lucide-react";
import { useState } from "react";

interface HeroProps {
  onSearch: (query: string, type: string) => void;
  onCategorySelect?: (category: string) => void;
  totalListings?: number;
}

const quickNeeds = [
  { label: "Shortlets", type: "Short Let", emoji: "🛌" },
  { label: "For rent", type: "For Rent", emoji: "🏘️" },
  { label: "Book hotels", type: "Hotel", emoji: "🏪" },
  { label: "Landed properties", type: "Land", emoji: "🏚️" },
];

export default function HeroSection({ onSearch, onCategorySelect, totalListings = 0 }: HeroProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");

  const runSearch = () => onSearch(query, type);

  return (
    <section className="border-b border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,253,244,0.78))] px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            NaijaStay property search
          </div>
          <h1 className="max-w-[620px] font-display text-3xl font-semibold leading-tight text-foreground md:text-4xl">
            What kind of place do you need today?
          </h1>
          <p className="mt-2 max-w-[560px] text-sm leading-6 text-muted-foreground">
            Tell us the location and the kind of property you want. Listings are already waiting below.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
            <span className="rounded-md border border-primary/15 bg-white px-3 py-1.5">{totalListings} live listings</span>
            <span className="rounded-md border border-primary/15 bg-white px-3 py-1.5">Verified homes</span>
            <span className="rounded-md border border-primary/15 bg-white px-3 py-1.5">Rent, buy, short let</span>
          </div>
        </div>

        <div className="rounded-lg border border-primary/15 bg-white p-3 shadow-[0_18px_45px_-36px_rgba(21,128,61,0.72)]">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">
                Where would you love to go?
              </label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/45 px-3 py-2.5">
                <MapPin size={17} className="shrink-0 text-primary" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") runSearch();
                  }}
                  placeholder="GRA, Woji, Trans Amadi..."
                  className="w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">
                What do you want?
              </label>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="h-[42px] w-full rounded-md border border-border bg-secondary/45 px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Any property</option>
                <option value="For Rent">Apartment for rent</option>
                <option value="For Sale">House for sale</option>
                <option value="Short Let">Short let</option>
              </select>
            </div>

            <button
              onClick={runSearch}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Search size={16} /> Search
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickNeeds.map((item) => {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setType(["For Rent", "For Sale", "Short Let"].includes(item.type) ? item.type : "");
                    onCategorySelect?.(item.type);
                  }}
                  className="flex min-h-[58px] items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-left text-xs font-bold leading-tight text-foreground transition-colors hover:border-primary/35 hover:bg-secondary"
                >
                  <span className="text-2xl leading-none" aria-hidden="true">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
