import { ArrowLeft, CalendarDays, Flag, Headphones, Heart, MessageCircle, MessageSquare, Phone, Share2, ShieldCheck, Star } from "lucide-react";
import { Property, formatFullPrice } from "@/lib/data";
import { getListingPrice, getRentalPricingSummary, formatNaira } from "@/lib/pricing";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import AuthModal from "./AuthModal";
import PropertyActionModal from "./PropertyActionModal";
import LandlordProfileModal from "./LandlordProfileModal";
import ListingMessageModal, { ListingMessageMode } from "./ListingMessageModal";
import PropertyMap from "./PropertyMap";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  property: Property;
  isFavorite: boolean;
  onFavorite: (id: string) => void;
  onBack: () => void;
  onSelectProperty: (property: Property) => void;
}

function badgeClass(type: string) {
  if (type === "For Sale") return "bg-primary text-primary-foreground";
  if (type === "For Rent") return "bg-naija-blue text-primary-foreground";
  if (type === "Short Let") return "bg-naija-purple text-primary-foreground";
  return "bg-naija-green text-primary-foreground";
}

function getWhatsAppUrl(phone: string, propertyTitle: string) {
  const cleaned = phone.replace(/\D/g, "");
  const formatted = cleaned.startsWith("0") ? "234" + cleaned.slice(1) : cleaned;
  const msg = encodeURIComponent(`Hi, I'm interested in your property: "${propertyTitle}" listed on NaijaStays. Please share more details.`);
  return `https://wa.me/${formatted}?text=${msg}`;
}

function AutoPreviewVideo({ src, className }: { src: string; className: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const playAttempt = video.play();
          if (playAttempt && typeof playAttempt.catch === "function") playAttempt.catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.55 },
    );
    observer.observe(video);
    return () => { observer.disconnect(); video.pause(); };
  }, [src]);
  return <video ref={videoRef} src={src} controls muted loop playsInline preload="metadata" className={className} />;
}

export default function PropertyDetail({ property: p, isFavorite, onFavorite, onBack, onSelectProperty }: Props) {
  const { user } = useAuth();
  const location = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [actionMode, setActionMode] = useState<"offer" | "booking" | "protection" | "escrow" | null>(null);
  const [messageMode, setMessageMode] = useState<ListingMessageMode | null>(null);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [landlordProfile, setLandlordProfile] = useState<{ full_name: string | null; phone: string | null; avatar_url: string | null } | null>(null);
  const [landlordStats, setLandlordStats] = useState({ listings: 0, reviews: 0, rating: 0 });
  const [imgIdx, setImgIdx] = useState(0);
  const imageSources = Array.isArray(p.images) ? p.images.filter((src): src is string => Boolean(src && src.trim())) : [];
  const imgs = imageSources.length > 0 ? imageSources : ["/placeholder.svg"];
  const media = (p.video_url && p.video_url.trim()
    ? [{ type: "video" as const, src: p.video_url }, ...imgs.map((src) => ({ type: "image" as const, src }))]
    : imgs.map((src) => ({ type: "image" as const, src })));
  const currentMedia = media[Math.min(imgIdx, media.length - 1)] ?? { type: "image" as const, src: "/placeholder.svg" };
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?listing=${p.id}` : "";
  const isSale = p.listing_type === "For Sale";
  const isNightly = p.listing_type === "Short Let";
  const isLiveListing = Boolean(p.user_id) && !p.id.startsWith("seed-");
  const isRent = p.listing_type === "For Rent";
  const rating = typeof p.rating === "number" ? p.rating : 0;
  const reviewCount = typeof p.reviews_count === "number" ? p.reviews_count : 0;
  const amenities = Array.isArray(p.amenities) ? p.amenities.filter(Boolean) : [];
  const agentName = p.agent_name?.trim() || "NaijaStays Host";
  const agentTitle = p.agent_title?.trim() || "Verified property contact";
  const locationLabel = p.address || [p.city, p.state].filter(Boolean).join(", ") || "Nigeria";
  const isHotel = p.property_type === "Hotel";
  const listingPrice = getListingPrice(p);
  const rentalPricing = getRentalPricingSummary(p);
  const rentalBaseAmount = rentalPricing?.moveInTotal || rentalPricing?.renewalRate || p.price;

  useEffect(() => {
    if (!isLiveListing) return;
    void supabase.from("property_engagement_events").insert({
      property_id: p.id,
      viewer_id: user?.id ?? null,
      event_type: "detail_view",
    }).then(({ error }) => {
      if (error) console.error("Detail view tracking failed:", error);
    });
  }, [isLiveListing, p.id, user?.id]);

  useEffect(() => {
    if (!isLiveListing) return;
    void Promise.all([
      supabase.from("profiles").select("full_name, phone, avatar_url").eq("user_id", p.user_id).maybeSingle(),
      supabase.from("properties").select("id").eq("user_id", p.user_id),
      supabase.from("landlord_reviews").select("rating").eq("landlord_id", p.user_id).eq("status", "published"),
    ]).then(([profileResult, listingsResult, reviewsResult]) => {
      setLandlordProfile(profileResult.data);
      const reviews = reviewsResult.data || [];
      setLandlordStats({
        listings: listingsResult.data?.length || 0,
        reviews: reviews.length,
        rating: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0,
      });
    });
  }, [isLiveListing, p.user_id]);

  useEffect(() => { setImgIdx(0); }, [p.id]);

  useEffect(() => {
    if (!isLiveListing || !user || typeof window === "undefined") return;
    const params = new URLSearchParams(location.search);
    if (params.get("chat") === "open") {
      setChatThreadId(params.get("thread"));
      setMessageMode("landlord_chat");
      params.delete("chat");
      params.delete("thread");
      const nextQuery = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
    }
  }, [isLiveListing, location.search, p.id, user?.id]);

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = "/placeholder.svg";
  };

  const shareListing = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: p.title, text: `Check out this NaijaStays listing: ${p.title}`, url: shareUrl });
      } catch {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Listing link copied to clipboard!");
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Listing link copied to clipboard!");
    }
  };
  const svcFee = Math.round(rentalBaseAmount * (isNightly || isHotel ? 0.12 : isRent ? 0.05 : 0.02));
  const total = rentalBaseAmount + svcFee;

  const openAction = (mode: "offer" | "booking" | "protection" | "escrow") => {
    if (!user) { setAuthOpen(true); return; }
    if (!isLiveListing) { toast.info("This demo listing is not yet live for requests."); return; }
    setActionMode(mode);
  };

  const openMessage = (mode: ListingMessageMode) => {
    if (!user) { setAuthOpen(true); return; }
    if (!isLiveListing) { toast.info("This demo listing is not yet live for messages."); return; }
    setMessageMode(mode);
  };

  const handleBook = () => {
    if (!user) { setAuthOpen(true); return; }
    if (isNightly || isRent || isHotel) { openAction("booking"); return; }
    if (p.agent_phone) { window.open(getWhatsAppUrl(p.agent_phone, p.title), "_blank"); }
    else { toast.success("Viewing request sent! The landlord will follow up."); }
  };

  const handleWhatsApp = () => {
    if (!p.agent_phone) { toast.error("No contact number available"); return; }
    window.open(getWhatsAppUrl(p.agent_phone, p.title), "_blank");
  };

  const handleCall = () => {
    if (!p.agent_phone) { toast.error("No contact number available"); return; }
    window.location.href = `tel:${p.agent_phone}`;
  };

  return (
    <div className="min-h-screen pb-44 lg:pb-24 bg-[linear-gradient(180deg,rgba(248,252,248,0.95),rgba(255,255,255,1))]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-8 pt-5 pb-2">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ArrowLeft size={16} /> Back to listings
        </button>
        <button onClick={shareListing} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80">
          <Share2 size={16} /> Share listing
        </button>
      </div>

      {/* Mobile image carousel */}
      <div className="md:hidden relative">
        <div className="overflow-hidden h-64">
          {currentMedia.type === 'video' ? (
            <AutoPreviewVideo src={currentMedia.src} className="w-full h-full object-cover" />
          ) : (
            <img src={currentMedia.src} alt={p.title} onError={handleImageError} className="w-full h-full object-cover" />
          )}
        </div>
        {media.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {media.map((_, i) => (
              <button key={i} onClick={() => setImgIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === imgIdx ? "bg-white scale-125" : "bg-white/50"}`} />
            ))}
          </div>
        )}
        <button onClick={() => { if (!user) { setAuthOpen(true); return; } onFavorite(p.id); }}
          className="absolute top-3 right-3 bg-white/90 rounded-full p-2 shadow">
          <Heart size={16} className={isFavorite ? "fill-primary text-primary" : "text-foreground"} />
        </button>
      </div>

      {/* Desktop gallery */}
      <div className="hidden md:block relative px-8 py-4">
        <div className="h-[380px] rounded-lg overflow-hidden">
          {currentMedia.type === 'video' ? (
            <AutoPreviewVideo src={currentMedia.src} className="w-full h-full object-cover" />
          ) : (
            <img src={currentMedia.src} alt={p.title} onError={handleImageError} className="w-full h-full object-cover" />
          )}
        </div>
        {media.length > 1 && (
          <div className="flex gap-2 mt-3 justify-center">
            {media.slice(0, 5).map((item, i) => (
              <button key={i} onClick={() => setImgIdx(i)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === imgIdx ? "border-primary" : "border-border"}`}>
                {item.type === 'video' ? (
                  <video src={item.src} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.src} alt="" onError={handleImageError} className="w-full h-full object-cover" />
                )}
              </button>
            ))}
            {media.length > 5 && (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">+{media.length - 5}</div>
            )}
          </div>
        )}
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 px-4 md:px-8 py-5 pb-8">
        {/* Main */}
        <div>
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${badgeClass(p.listing_type)}`}>{p.listing_type}</span>
            {p.verified && <span className="inline-flex items-center gap-1 text-[11px] text-naija-green font-bold bg-naija-green-bg px-2 py-0.5 rounded-lg">✓ Verified</span>}
            {p.unit_type && <span className="inline-flex items-center gap-1 text-[11px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-lg">{p.unit_type}</span>}
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-2">{p.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
            <span>📍 {locationLabel}</span>
            {rating > 0 && <span>★ {rating} · {reviewCount} reviews</span>}
          </div>
          <div className="font-display text-3xl font-semibold text-primary mb-7">
            {listingPrice.formatted}{listingPrice.label && <span className="font-body text-base text-muted-foreground ml-1.5">{listingPrice.label}</span>}
          </div>

          {isRent && rentalPricing && (
            <div className="mb-7 grid gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Total move-in payment</p>
                <p className="mt-1 font-display text-xl font-semibold text-foreground">
                  {rentalPricing.moveInTotal ? formatNaira(rentalPricing.moveInTotal) : "Confirm with landlord"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Renewal rate</p>
                <p className="mt-1 font-display text-xl font-semibold text-foreground">
                  {formatNaira(rentalPricing.renewalRate)} <span className="font-body text-sm text-muted-foreground">{rentalPricing.label}</span>
                </p>
              </div>
            </div>
          )}

          {(p.beds ?? 0) > 0 && (
            <div className="flex gap-5 flex-wrap py-4 border-y border-border mb-7">
              <span className="flex items-center gap-2 text-sm font-medium">
                🛏 {p.beds} {isHotel ? "Rooms" : "Bedrooms"}
              </span>
              <span className="flex items-center gap-2 text-sm font-medium">
                🚿 {p.baths} Bathrooms
              </span>
              {p.size && <span className="flex items-center gap-2 text-sm font-medium">📐 {p.size}</span>}
            </div>
          )}

          {p.description && (
            <div className="mb-7">
              <h3 className="text-lg font-semibold text-foreground mb-3">About this property</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
            </div>
          )}

          {p.writeup && (
            <div className="mb-7">
              <h3 className="text-lg font-semibold text-foreground mb-3">The full story</h3>
              {p.writeup.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-4">{para}</p>
              ))}
            </div>
          )}

          {amenities.length > 0 && (
            <>
              <hr className="border-border my-6" />
              <div className="mb-7">
                <h3 className="text-lg font-semibold text-foreground mb-3">What this place offers</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2.5 text-sm font-medium text-foreground px-3.5 py-2.5 bg-naija-surface rounded-lg">
                      <span className="text-primary">✓</span> {a}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <hr className="border-border my-6" />

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Location</h3>
            <PropertyMap address={p.address} city={p.city} state={p.state} />
          </div>

          {isLiveListing && (
            <div className="mt-6 rounded-2xl border border-primary/15 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(21,128,61,0.55)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {landlordProfile?.avatar_url ? <img src={landlordProfile.avatar_url} alt={landlordProfile.full_name || "Landlord"} className="h-full w-full object-cover" /> : (landlordProfile?.full_name || agentName).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{landlordProfile?.full_name || agentName}</div>
                    <div className="truncate text-xs text-muted-foreground">{agentTitle}{landlordProfile?.phone ? ` · ${landlordProfile.phone}` : ""}</div>
                  </div>
                </div>
                <button onClick={() => setProfileOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                  <Star size={15} className="fill-amber-300 text-amber-300" /> View profile & review
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                <div><div className="text-lg font-semibold text-foreground">{landlordStats.listings}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Listings</div></div>
                <div><div className="text-lg font-semibold text-foreground">{landlordStats.rating ? landlordStats.rating.toFixed(1) : "New"}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating</div></div>
                <div><div className="text-lg font-semibold text-foreground">{landlordStats.reviews}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reviews</div></div>
              </div>
            </div>
          )}

          <hr className="border-border my-6" />

          <div className="rounded-[26px] border border-primary/10 bg-[linear-gradient(180deg,rgba(240,253,244,0.9),rgba(255,255,255,1))] p-5 shadow-[0_20px_45px_-38px_rgba(21,128,61,0.65)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                  <ShieldCheck size={14} /> NaijaStays Protection
                </div>
                <h3 className="mt-3 text-lg font-semibold text-foreground">Trust cover for buyers, renters, and landlords</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use verified listings, leave a documented offer or booking trail, and open a protection case if anything feels off.
                </p>
              </div>
              <button onClick={() => openAction("protection")} className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                Open protection case
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                "Offers and reservations are logged in the platform",
                "Admins can investigate payment or access issues",
                "Landlords and guests both get a clearer audit trail",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white bg-white/80 px-4 py-3 text-sm text-foreground">{item}</div>
              ))}
            </div>
            <button onClick={() => openAction("escrow")} className="mt-4 rounded-full border border-primary/20 bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5">
              Use NaijaStays escrow instead
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <div className="bg-card border border-primary/10 rounded-2xl p-6 sticky top-20 shadow-[0_24px_50px_-36px_rgba(21,128,61,0.55)]">
            <div className="font-display text-2xl font-semibold text-primary mb-1">
              {listingPrice.formatted} <span className="font-body text-sm text-muted-foreground">{listingPrice.label || "total"}</span>
            </div>
            {rating > 0 && <p className="text-sm text-muted-foreground mb-4">★ {rating} · {reviewCount} reviews · {p.city || p.state || "Nigeria"}</p>}

            {(isNightly || isRent || isHotel) && (
              <div className="border border-border rounded-lg overflow-hidden mb-3">
                <div className="grid grid-cols-2">
                  <div className="p-3 border-r border-border">
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">{isNightly || isHotel ? "Check-in" : "Move in"}</label>
                    <input type="date" className="border-none bg-transparent text-sm text-foreground w-full outline-none" />
                  </div>
                  <div className="p-3">
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">{isNightly || isHotel ? "Check-out" : "Move out"}</label>
                    <input type="date" className="border-none bg-transparent text-sm text-foreground w-full outline-none" />
                  </div>
                </div>
                <div className="p-3 border-t border-border">
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Guests</label>
                  <select className="border-none bg-transparent text-sm text-foreground w-full outline-none">
                    <option>1 guest</option><option>2 guests</option><option>3+ guests</option>
                  </select>
                </div>
              </div>
            )}

            <button onClick={isSale ? () => openAction("offer") : handleBook}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-lg font-bold text-[15px] hover:opacity-90 transition-opacity mb-3">
              {user ? (isSale ? "Make an Offer" : "Reserve Now") : "Login to proceed"}
            </button>

            <button onClick={() => openMessage("landlord_chat")} className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5">
              <MessageSquare size={15} /> Chat on NaijaStay
            </button>

            <button onClick={() => openAction("escrow")} className="mb-3 w-full rounded-lg border border-primary/20 bg-secondary px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-secondary/80">
              Pay through NaijaStays escrow
            </button>

            {isSale && (
              <button onClick={handleBook} className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-secondary px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-secondary/80">
                <CalendarDays size={15} /> Request viewing
              </button>
            )}

            {!isSale && (
              <div className="mb-3 rounded-2xl border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
                Your request stays on-platform first, then the landlord can confirm timing with you directly.
              </div>
            )}

            <div className={`grid gap-2 mb-3 ${p.agent_phone ? "grid-cols-2" : "grid-cols-1"}`}>
              <button onClick={() => openAction("protection")} className="flex items-center justify-center gap-1.5 py-2.5 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-naija-surface transition-colors">
                <ShieldCheck size={15} /> Protection
              </button>
              {p.agent_phone && (
                <button onClick={handleWhatsApp} className="flex items-center justify-center gap-1.5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-colors">
                  <MessageCircle size={15} /> WhatsApp
                </button>
              )}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <button onClick={() => openMessage("admin_contact")} className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-foreground transition hover:bg-naija-surface">
                <Headphones size={15} /> Admin
              </button>
              <button onClick={() => openMessage("listing_report")} className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                <Flag size={15} /> Report
              </button>
            </div>

            {p.agent_phone && (
              <button onClick={handleCall} className="mb-3 flex w-full items-center justify-center gap-1.5 py-2.5 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-naija-surface transition-colors">
                <Phone size={15} /> Call agent
              </button>
            )}

            {(isNightly || isRent || isHotel) && (
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{isRent ? "Listed total" : `${listingPrice.formatted} × 1 night`}</span>
                  <span>{formatFullPrice(rentalBaseAmount)}</span>
                </div>
                {isRent && rentalPricing?.renewalRate && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Renewal rate</span>
                    <span>{formatNaira(rentalPricing.renewalRate)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>NaijaStays service fee</span>
                  <span>{formatFullPrice(svcFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground pt-3 border-t border-border">
                  <span>Total</span>
                  <span>{formatFullPrice(total)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border">
              <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-primary shrink-0">
                {agentName[0]}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{agentName}</div>
                <div className="text-[11px] text-muted-foreground">{agentTitle}</div>
              </div>
            </div>

            {isLiveListing && (
              <button onClick={() => setProfileOpen(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/10">
                <Star size={15} className="fill-amber-400 text-amber-400" />
                {rating > 0 ? "View reviews or leave a rating" : "Be the first to rate this landlord"}
              </button>
            )}
          </div>

          <button onClick={() => { if (!user) { setAuthOpen(true); return; } onFavorite(p.id); }}
            className="w-full py-3 mt-3 border border-border rounded-lg text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5 bg-card">
            <Heart size={14} className={isFavorite ? "fill-primary text-primary" : ""} />
            {isFavorite ? "Saved to favorites" : "Save to favorites"}
          </button>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-30">
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold text-foreground text-lg leading-tight truncate">{listingPrice.formatted}</div>
            {listingPrice.label && <div className="text-xs text-muted-foreground">{listingPrice.label}</div>}
          </div>
          {p.agent_phone && (
            <button onClick={handleCall} className="flex shrink-0 items-center gap-1.5 px-3 py-2.5 border border-border rounded-full text-sm font-semibold text-foreground hover:bg-naija-surface transition-colors">
              <Phone size={14} /> Call
            </button>
          )}
          <button onClick={isSale ? () => openAction("offer") : handleBook}
            className="min-w-[104px] flex-1 py-2.5 bg-primary text-primary-foreground rounded-full font-bold text-sm hover:opacity-90 transition-opacity">
            {user ? (isSale ? "Make Offer" : "Reserve") : "Login"}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button onClick={() => openMessage("landlord_chat")} className="inline-flex items-center justify-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary">
            <MessageSquare size={13} /> Chat
          </button>
          <button onClick={() => openMessage("admin_contact")} className="inline-flex items-center justify-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-bold text-foreground">
            <Headphones size={13} /> Admin
          </button>
          <button onClick={() => openMessage("listing_report")} className="inline-flex items-center justify-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            <Flag size={13} /> Report
          </button>
        </div>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />
      {actionMode && (
        <PropertyActionModal mode={actionMode} property={p} onClose={() => setActionMode(null)} />
      )}
      {messageMode && (
        <ListingMessageModal property={p} mode={messageMode} initialThreadId={chatThreadId} onClose={() => { setMessageMode(null); setChatThreadId(null); }} />
      )}
      {profileOpen && isLiveListing && (
        <LandlordProfileModal
          landlordId={p.user_id}
          currentPropertyId={p.id}
          onClose={() => setProfileOpen(false)}
          onSelectProperty={(property) => { setProfileOpen(false); onSelectProperty(property); }}
        />
      )}
    </div>
  );
}
