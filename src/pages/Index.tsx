import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Property, SEED_LISTINGS } from "@/lib/data";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CategoriesBar from "@/components/CategoriesBar";
import PropertyCard from "@/components/PropertyCard";
import PropertyDetail from "@/components/PropertyDetail";
import ListPropertyForm from "@/components/ListPropertyForm";
import LandlordDashboard from "@/components/LandlordDashboard";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function Index() {
  const { user, isLandlord } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [listingPreset, setListingPreset] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [queryListingId, setQueryListingId] = useState<string | null>(null);
  const [showListForm, setShowListForm] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const clearListingUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("category");
    params.delete("preset");
    params.delete("search");
    params.delete("listing");
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  };

  const fetchProperties = useCallback(async () => {
    const { data } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
    if (data && data.length > 0) {
      setProperties(data as Property[]);
    } else {
      setProperties(SEED_LISTINGS.map((l) => ({ ...l, user_id: "" })) as Property[]);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    if (!user) { setFavorites(new Set()); return; }
    const { data } = await supabase.from("favorites").select("property_id").eq("user_id", user.id);
    setFavorites(new Set(data?.map((f) => f.property_id) || []));
  }, [user]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);
  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const listingId = params.get("listing");
    const paymentStatus = params.get("payment_status");
    const paymentKind = params.get("payment_kind");
    const category = params.get("category");
    const preset = params.get("preset");
    const searchTerm = params.get("search");

    setActiveCat(category || "all");
    setListingPreset(preset || "");
    setSearch(searchTerm || "");
    setQuickFilter("all");

    if (category || preset) {
      setTypeFilter("");
    }

    if (paymentStatus === "started") {
      toast.success(
        paymentKind === "escrow"
          ? "🎉 Your escrow payment is processing. NaijaStays will confirm it before moving the request forward."
          : "🎉 Your payment is processing! Your promotion will only go live once Korapay confirms it.",
      );
      params.delete("payment_status");
      params.delete("payment_kind");
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", newUrl);
    }

    if (listingId) {
      setQueryListingId(listingId);
    } else {
      setQueryListingId(null);
    }
  }, [location.search]);

  useEffect(() => {
    if (queryListingId && properties.length > 0 && !selectedProperty) {
      const found = properties.find((p) => p.id === queryListingId);
      if (found) {
        setSelectedProperty(found);
      }
    }
  }, [queryListingId, properties, selectedProperty]);

  useEffect(() => {
    if (location.hash === "#listings" && !selectedProperty) {
      window.requestAnimationFrame(() => {
        document.getElementById("listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.hash, selectedProperty]);

  const openProperty = (property: Property) => {
    if (property.user_id && !property.id.startsWith("seed-")) {
      void supabase.from("property_engagement_events").insert({
        property_id: property.id,
        viewer_id: user?.id ?? null,
        event_type: "listing_click",
      });
    }
    setSelectedProperty(property);
    const params = new URLSearchParams(window.location.search);
    params.set("listing", property.id);
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
    window.scrollTo(0, 0);
  };

  const toggleFavorite = async (id: string) => {
    if (!user) { toast.error("Please log in to save favorites"); return; }
    const isFav = favorites.has(id);
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("property_id", id);
      setFavorites((prev) => { const s = new Set(prev); s.delete(id); return s; });
      toast.success("Removed from saved");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, property_id: id });
      setFavorites((prev) => new Set(prev).add(id));
      toast.success("❤ Saved to favorites!");
    }
  };

  const selectCategory = (category: string) => {
    setActiveCat(category);
    setTypeFilter("");
    setListingPreset("");
    setQuickFilter("all");
  };

  const searchListings = (query: string, type: string) => {
    setSearch(query);
    setTypeFilter(type);
    setListingPreset("");
    setQuickFilter("all");
  };

  const filtered = properties.filter((p) => {
    if (listingPreset === "land-commercial") {
      const combinedText = `${p.title} ${p.description || ""} ${p.writeup || ""} ${p.address || ""}`.toLowerCase();
      const matchesLandOrCommercial = p.property_type === "Land" || combinedText.includes("commercial");
      if (!matchesLandOrCommercial) return false;
    }

    if (activeCat !== "all") {
      if (["Short Let", "For Rent", "For Sale"].includes(activeCat) && p.listing_type !== activeCat) return false;
      if (!["all", "Short Let", "For Rent", "For Sale"].includes(activeCat) && p.property_type !== activeCat) return false;
    }
    const q = search.toLowerCase();
    if (q && !`${p.title} ${p.city} ${p.description} ${p.property_type}`.toLowerCase().includes(q)) return false;
    if (typeFilter && p.listing_type !== typeFilter) return false;
    if (quickFilter === "verified" && !p.verified) return false;
    if (quickFilter === "apartment" && p.property_type !== "Apartment") return false;
    if (quickFilter === "short-let" && p.listing_type !== "Short Let") return false;
    if (quickFilter === "video" && !p.video_url) return false;
    return true;
  });

  // Dynamic trusted areas from actual listings
  const trustedAreas = useMemo(() => {
    const groups: Record<string, { count: number; img: string | null }> = {};
    properties.forEach((p) => {
      const city = p.city?.trim();
      if (!city) return;
      if (!groups[city]) {
        groups[city] = { count: 0, img: null };
      }
      groups[city].count += 1;
      if (!groups[city].img && p.images && p.images.length > 0) {
        groups[city].img = p.images[0];
      }
    });
    return Object.entries(groups)
      .map(([name, data]) => ({ name, count: data.count, img: data.img }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [properties]);

  // Landlord Dashboard
  if (showDashboard && user && isLandlord) {
    return (
      <>
        <Navbar onSearch={() => {}} onDashboard={() => setShowDashboard(false)} />
        <LandlordDashboard onBack={() => setShowDashboard(false)} />
      </>
    );
  }

  // Property Detail
  if (selectedProperty) {
    return (
      <>
        <Navbar onSearch={() => {}} onDashboard={() => { setSelectedProperty(null); setShowDashboard(true); }} />
        <PropertyDetail
          property={selectedProperty}
          isFavorite={favorites.has(selectedProperty.id)}
          onFavorite={toggleFavorite}
          onSelectProperty={openProperty}
          onBack={() => {
            setSelectedProperty(null);
            const params = new URLSearchParams(window.location.search);
            params.delete("listing");
            const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
            window.history.replaceState({}, "", nextUrl);
            window.scrollTo(0, 0);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar
        onSearch={(v) => { setSearch(v); setSelectedProperty(null); setListingPreset(""); }}
        onDashboard={() => setShowDashboard(true)}
        onAdmin={() => navigate("/admin")}
      />
      <main className="flex-1">
      <HeroSection
        onSearch={searchListings}
        onCategorySelect={selectCategory}
        totalListings={properties.length}
      />

      <section id="listings" className="scroll-mt-24 border-b border-border bg-white px-4 py-4 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Available now</p>
              <h2 className="font-display text-2xl font-semibold text-foreground">Listings you can open immediately</h2>
            </div>
            <span className="text-sm font-semibold text-muted-foreground">
              {filtered.length} propert{filtered.length === 1 ? "y" : "ies"} shown
            </span>
          </div>

          <CategoriesBar active={activeCat} onSelect={selectCategory} />

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "all", label: "All listings" },
              { id: "verified", label: "Verified only" },
              { id: "apartment", label: "Apartments" },
              { id: "short-let", label: "Short lets" },
              { id: "video", label: "With video" },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setQuickFilter(filter.id)}
                className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                  quickFilter === filter.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/55 text-foreground hover:border-primary/35"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-5 pb-10 sm:grid-cols-2 md:px-8 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="font-display text-2xl font-medium mb-2">No properties found</h3>
            <p className="text-sm text-muted-foreground mb-5">Try adjusting your search or filters</p>
            <button onClick={() => { setActiveCat("all"); setSearch(""); setTypeFilter(""); setListingPreset(""); setQuickFilter("all"); clearListingUrlParams(); }}
              className="px-4 py-2 rounded-md text-sm font-medium border border-border bg-card">
              Clear all filters
            </button>
          </div>
        ) : (
          filtered.map((p) => (
            <PropertyCard key={p.id} property={p} isFavorite={favorites.has(p.id)}
              onFavorite={toggleFavorite} onClick={(id) => {
                const found = properties.find((x) => x.id === id);
                if (!found) return;
                openProperty(found);
              }} />
          ))
        )}
      </div>

      {/* Browse trusted areas — dynamically populated from listings */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-[22px] font-semibold text-foreground">Browse trusted areas</h2>
        </div>

        {trustedAreas.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {trustedAreas.map((c) => (
              <div
                key={c.name}
                onClick={() => {
                  setSearch(c.name);
                  setListingPreset("");
                  setActiveCat("all");
                  setTypeFilter("");
                  setQuickFilter("all");
                  document.getElementById("listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="relative rounded-xl overflow-hidden cursor-pointer h-[148px] transition-transform hover:scale-[1.02]"
              >
                {c.img ? (
                  <img src={c.img} alt={c.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3.5">
                  <div className="text-[15px] font-bold text-card">{c.name}</div>
                  <div className="text-[11px] text-card/80 mt-0.5">{c.count} listing{c.count === 1 ? "" : "s"}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-primary/10 bg-secondary/40 p-8 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">📍 Areas coming soon</p>
            <p className="text-xs text-muted-foreground">Trusted areas will appear here automatically as properties are listed on NaijaStays.</p>
          </div>
        )}

        {/* Expansion note */}
        <div className="mt-6 bg-secondary border border-primary/15 rounded-2xl p-5 text-center shadow-[0_18px_40px_-34px_rgba(21,128,61,0.8)]">
          <p className="text-sm font-semibold text-foreground mb-1">🚀 Expanding with care</p>
          <p className="text-xs text-muted-foreground">NaijaStays is focused on trusted growth, starting from Port Harcourt and Rivers State before rolling into more Nigerian cities.</p>
        </div>
      </div>

      <div className="mx-auto mb-10 grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        {[
          { icon: "✅", title: "Verified properties", text: "Every listing is confirmed by our in-house team before going live." },
          { icon: "🔒", title: "Secure transactions", text: "Your payments and personal data are always protected." },
          { icon: "🤝", title: "Trusted agents", text: "All agents are licensed and background-checked by NaijaStays." },
          { icon: "⚡", title: "Fast responses", text: "Average agent response time under 2 hours, guaranteed." },
        ].map((t) => (
          <div key={t.title} className="text-center">
            <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl">{t.icon}</div>
            <div className="text-sm font-semibold text-foreground mb-1">{t.title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{t.text}</div>
          </div>
        ))}
      </div>

      </main>
      <Footer />

      {/* Landlord FAB */}
      {user && isLandlord && (
        <button onClick={() => setShowListForm(true)}
          className="fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity z-30">
          <Plus size={24} />
        </button>
      )}

      {showListForm && <ListPropertyForm onClose={() => setShowListForm(false)} onSuccess={fetchProperties} />}
    </div>
  );
}