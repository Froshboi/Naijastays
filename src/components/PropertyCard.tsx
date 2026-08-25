import { Heart, Share2 } from "lucide-react";
import type { MouseEvent } from "react";
import { Property, formatPrice } from "@/lib/data";

interface PropertyCardProps {
  property: Property;
  isFavorite: boolean;
  onFavorite: (id: string) => void;
  onClick: (id: string) => void;
}

function badgeClass(type: string) {
  if (type === "For Sale") return "bg-primary text-primary-foreground";
  if (type === "For Rent") return "bg-naija-blue text-primary-foreground";
  if (type === "Short Let") return "bg-naija-purple text-primary-foreground";
  return "bg-naija-green text-primary-foreground";
}

export default function PropertyCard({ property: p, isFavorite, onFavorite, onClick }: PropertyCardProps) {
  const mainImg = p.images?.[0] || "/placeholder.svg";
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?listing=${p.id}` : "";

  const shareCard = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: p.title,
          text: `Check out this NaijaStays listing: ${p.title}`,
          url: shareUrl,
        });
        return;
      } catch {
        // fall through to clipboard fallback
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    window.alert("Listing link copied to clipboard.");
  };

  const isHotel = p.property_type === "Hotel";
  const bedLabel = isHotel ? "room" : "bed";
  const bedLabelPlural = isHotel ? "rooms" : "beds";

  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_35px_-28px_rgba(21,128,61,0.6)] hover:border-primary/25"
      onClick={() => onClick(p.id)}>
      <div className="relative h-[174px] overflow-hidden bg-naija-surface">
        <img
          src={mainImg}
          alt={p.title}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/placeholder.svg";
          }}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <button
          onClick={shareCard}
          className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 backdrop-blur transition-transform hover:scale-105"
          title="Share listing"
        >
          <Share2 size={16} className="text-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(p.id); }}
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 backdrop-blur transition-transform hover:scale-105">
          <Heart size={16} className={isFavorite ? "fill-primary text-primary" : "text-foreground"} />
        </button>
        <span className={`absolute bottom-2 left-2 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${badgeClass(p.listing_type)}`}>
          {p.listing_type}
        </span>
        {p.promoted && (
          <span className="absolute bottom-2 right-2 rounded-md bg-white/92 px-2 py-1 text-[11px] font-bold text-primary shadow-sm">
            Featured
          </span>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-sm font-semibold text-foreground leading-snug flex-1 mr-2 line-clamp-2">{p.title}</h3>
          {p.rating ? (
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground shrink-0">
              <span className="text-primary text-xs">★</span> {p.rating}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground mb-2">📍 {p.city}, {p.state}</p>
        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          {(p.beds ?? 0) > 0 && (
            <span className="text-[11px] text-muted-foreground bg-naija-surface px-1.5 py-0.5 rounded font-medium">
              🛏 {p.beds} {p.beds === 1 ? bedLabel : bedLabelPlural}
            </span>
          )}
          {(p.baths ?? 0) > 0 && (
            <span className="text-[11px] text-muted-foreground bg-naija-surface px-1.5 py-0.5 rounded font-medium">
              🚿 {p.baths} bath
            </span>
          )}
          {p.size && (
            <span className="text-[11px] text-muted-foreground bg-naija-surface px-1.5 py-0.5 rounded font-medium">
              📐 {p.size}
            </span>
          )}
          {p.unit_type && (
            <span className="text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">
              {p.unit_type}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-lg font-semibold text-primary">{formatPrice(p.price)}</span>
          {p.price_label && <span className="text-xs text-muted-foreground">{p.price_label}</span>}
        </div>
        {p.verified && (
          <div className="inline-flex items-center gap-1 text-[11px] text-naija-green font-bold bg-naija-green-bg px-2 py-0.5 rounded mt-2">
            <span>✓</span> Verified listing
          </div>
        )}
      </div>
    </div>
  );
}