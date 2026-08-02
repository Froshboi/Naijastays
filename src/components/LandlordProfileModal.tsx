import { useEffect, useMemo, useState } from "react";
import { Loader2, Star, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Property, formatFullPrice } from "@/lib/data";
import { toast } from "sonner";

type ReviewRecord = Tables<"landlord_reviews">;
type ProfileRecord = Tables<"profiles">;

interface Props {
  landlordId: string;
  currentPropertyId?: string | null;
  onClose: () => void;
  onSelectProperty: (property: Property) => void;
}

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export default function LandlordProfileModal({
  landlordId,
  currentPropertyId,
  onClose,
  onSelectProperty,
}: Props) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [landlordProfile, setLandlordProfile] = useState<ProfileRecord | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    review: "",
  });

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [
        { data: profileData, error: profileError },
        { data: propertyData, error: propertyError },
        { data: reviewData, error: reviewError },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", landlordId).maybeSingle(),
        supabase.from("properties").select("*").eq("user_id", landlordId).order("created_at", { ascending: false }),
        supabase
          .from("landlord_reviews")
          .select("*")
          .eq("landlord_id", landlordId)
          .eq("status", "published")
          .order("created_at", { ascending: false }),
      ]);

      if (profileError) throw profileError;
      if (propertyError) throw propertyError;
      if (reviewError) throw reviewError;

      setLandlordProfile(profileData);
      setProperties((propertyData as Property[]) ?? []);
      setReviews(reviewData ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Could not load this landlord profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfileData();
  }, [landlordId]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);

  const activeListings = properties.filter((property) => property.status !== "occupied");

  const handleReviewSubmit = async () => {
    if (!user) {
      toast.error("Please log in to leave a review");
      return;
    }
    if (user.id === landlordId) {
      toast.error("You cannot review your own landlord profile");
      return;
    }
    if (!reviewForm.review.trim()) {
      toast.error("Please write a short review");
      return;
    }

    const payload: TablesInsert<"landlord_reviews"> = {
      landlord_id: landlordId,
      property_id: currentPropertyId ?? null,
      reviewer_id: user.id,
      reviewer_name: profile?.full_name || user.email || "NaijaStays user",
      rating: reviewForm.rating,
      review: reviewForm.review.trim(),
      status: "published",
    };

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("landlord_reviews")
        .upsert(payload, { onConflict: "landlord_id,property_id,reviewer_id" });
      if (error) throw error;
      toast.success("Your review has been saved");
      setReviewForm({ rating: 5, review: "" });
      await fetchProfileData();
    } catch (error: any) {
      toast.error(error.message || "Could not save your review");
    } finally {
      setSubmitting(false);
    }
  };

  const landlordName = landlordProfile?.full_name?.trim() || "NaijaStays Landlord";
  const initials = landlordName.charAt(0).toUpperCase() || "N";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-primary/10 bg-white shadow-[0_35px_90px_-45px_rgba(21,128,61,0.65)]">
        <div className="flex items-start justify-between bg-gradient-to-r from-primary to-naija-blue px-6 py-5 text-white">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-white/70">Landlord profile</div>
            <h2 className="mt-2 text-2xl font-semibold">{landlordName}</h2>
            <p className="mt-1 text-sm text-white/80">
              View all active listings, public feedback, and trust signals before you proceed.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              Loading landlord profile...
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="rounded-[26px] border border-border bg-[linear-gradient(180deg,rgba(240,253,244,0.95),rgba(255,255,255,1))] p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                      {landlordProfile?.avatar_url ? (
                        <img src={landlordProfile.avatar_url} alt={landlordName} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-foreground">{landlordName}</h3>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                          Verified landlord
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {landlordProfile?.phone ? `Contact on file: ${landlordProfile.phone}` : "Contact details become available once your request is confirmed."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Average rating</div>
                      <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-foreground">
                        <Star size={18} className="fill-amber-400 text-amber-400" />
                        {averageRating > 0 ? averageRating.toFixed(1) : "New"}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reviews</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{reviews.length}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active listings</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{activeListings.length}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-border bg-white p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Listings by this landlord</h3>
                      <p className="text-sm text-muted-foreground">Open any listing to compare options from the same profile.</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {properties.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                        No public listings yet.
                      </div>
                    ) : (
                      properties.map((property) => (
                        <button
                          key={property.id}
                          onClick={() => {
                            onSelectProperty(property);
                            onClose();
                          }}
                          className="overflow-hidden rounded-[24px] border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_22px_50px_-36px_rgba(21,128,61,0.5)]"
                        >
                          <div className="h-40 w-full bg-secondary">
                            <img
                              src={property.images?.[0] || "/placeholder.svg"}
                              alt={property.title}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = "/placeholder.svg";
                              }}
                            />
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                                {property.listing_type}
                              </span>
                              {property.status && (
                                <span className="text-[11px] font-medium text-muted-foreground">{property.status}</span>
                              )}
                            </div>
                            <h4 className="mt-3 text-base font-semibold text-foreground">{property.title}</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {[property.city, property.state].filter(Boolean).join(", ") || "Nigeria"}
                            </p>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <div className="text-base font-semibold text-primary">{formatFullPrice(property.price)}</div>
                              {property.rating ? (
                                <div className="text-sm text-muted-foreground">★ {property.rating.toFixed(1)}</div>
                              ) : (
                                <div className="text-sm text-muted-foreground">No rating yet</div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[26px] border border-border bg-white p-6">
                  <h3 className="text-lg font-semibold text-foreground">Ratings and reviews</h3>
                  <div className="mt-5 space-y-4">
                    {reviews.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                        No reviews yet. Be the first to leave feedback after working with this landlord.
                      </div>
                    ) : (
                      reviews.map((review) => (
                        <div key={review.id} className="rounded-2xl border border-border bg-secondary/35 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-foreground">
                                {review.reviewer_name || "NaijaStays user"}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">{formatShortDate(review.created_at)}</div>
                            </div>
                            <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground">
                              <Star size={14} className="fill-amber-400 text-amber-400" />
                              {review.rating.toFixed(1)}
                            </div>
                          </div>
                          {review.review && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{review.review}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[26px] border border-primary/10 bg-[linear-gradient(180deg,rgba(240,253,244,0.92),rgba(255,255,255,1))] p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <UserRound size={16} />
                    Leave a review
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Share how responsive, trustworthy, and professional this landlord was.
                  </p>

                  <div className="mt-4 flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        onClick={() => setReviewForm((current) => ({ ...current, rating: value }))}
                        className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                          reviewForm.rating >= value
                            ? "bg-primary text-white"
                            : "border border-border bg-white text-muted-foreground hover:border-primary/25 hover:text-primary"
                        }`}
                      >
                        {value}★
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reviewForm.review}
                    onChange={(event) => setReviewForm((current) => ({ ...current, review: event.target.value }))}
                    rows={4}
                    placeholder="Tell other users what it was like dealing with this landlord."
                    className="mt-4 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                  />

                  <button
                    onClick={handleReviewSubmit}
                    disabled={submitting}
                    className="mt-4 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {submitting ? "Saving review..." : "Submit review"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
