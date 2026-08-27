import { useEffect, useState } from "react";
import { ExternalLink, Loader2, MapPin } from "lucide-react";

interface PropertyMapProps {
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

interface Coordinates {
  lat: number;
  lon: number;
}

export default function PropertyMap({ address, city, state }: PropertyMapProps) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const location = [address, city, state, "Nigeria"].filter(Boolean).join(", ");
  const encodedLocation = encodeURIComponent(location);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCoordinates(null);

    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ng&q=${encodedLocation}`, {
      headers: { "Accept-Language": "en" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Map lookup failed");
        return response.json() as Promise<Array<{ lat: string; lon: string }>>;
      })
      .then((results) => {
        if (cancelled || !results[0]) return;
        setCoordinates({ lat: Number(results[0].lat), lon: Number(results[0].lon) });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [encodedLocation]);

  if (loading) {
    return (
      <div className="flex h-52 items-center justify-center gap-2 rounded-xl border border-border bg-naija-surface text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Finding this location...
      </div>
    );
  }

  if (!coordinates) {
    return (
      <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-naija-surface px-4 text-center">
        <MapPin size={24} className="text-primary" />
        <span className="text-sm font-medium text-foreground">{[city, state, "Nigeria"].filter(Boolean).join(", ")}</span>
        <a href={`https://www.openstreetmap.org/search?query=${encodedLocation}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          Open in OpenStreetMap <ExternalLink size={12} />
        </a>
      </div>
    );
  }

  const delta = 0.012;
  const bbox = `${coordinates.lon - delta},${coordinates.lat - delta},${coordinates.lon + delta},${coordinates.lat + delta}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${coordinates.lat},${coordinates.lon}`;
  const externalUrl = `https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lon}#map=16/${coordinates.lat}/${coordinates.lon}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-naija-surface">
      <iframe title={`Map showing ${location}`} src={mapUrl} className="h-52 w-full border-0" loading="lazy" />
      <div className="flex items-center justify-between gap-3 border-t border-border bg-white px-3 py-2 text-xs">
        <span className="truncate text-muted-foreground">Approximate location: {[city, state].filter(Boolean).join(", ") || "Nigeria"}</span>
        <a href={externalUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline">
          View larger <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
