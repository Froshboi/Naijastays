import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, ShieldAlert, Tag, Upload, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Property, formatFullPrice } from "@/lib/data";
import { toast } from "sonner";

type ActionMode = "offer" | "booking" | "protection" | "escrow";

interface PropertyActionModalProps {
  mode: ActionMode;
  property: Property;
  onClose: () => void;
  onSuccess?: () => void;
}

const EDGE_FN = "https://lvntcsobqtgtbnudiwmv.supabase.co/functions/v1/korapay-webhook";

const PROTECTION_CATEGORIES = [
  "Listing mismatch",
  "Payment concern",
  "Access problem",
  "Refund request",
  "Agent conduct",
  "Other",
];

const PRIORITY_OPTIONS = ["low", "medium", "high"];
const FINANCING_OPTIONS = ["Cash", "Mortgage", "Installment", "Still deciding"];
const ESCROW_REASONS = [
  "I want NaijaStays to hold the payment first",
  "I do not want to send money directly to the landlord",
  "I want a documented payment trail",
  "I am ready to secure the property today",
];

const CRYPTO_METHODS = [
  {
    id: "solana",
    name: "Solana (SOL)",
    address: "4MN7ZWDAu81U6UVttyRXkfMixXhUxvYnai3KP2yaqe9K",
    network: "Solana Network",
    warning: null,
    minNote: null,
  },
  {
    id: "btc",
    name: "Bitcoin (BTC)",
    address: "bc1qa6ne3p9484t66chvk8pkt48pgkzm70m5rmrzrr",
    network: "Bitcoin Network",
    warning: null,
    minNote: null,
  },
  {
    id: "usdt",
    name: "USDT (TRC20)",
    address: "TSxQCMXA58QkCfTLwbRHQ2F9VWKEh57Hi6",
    network: "TRON Network (TRC20) only",
    warning:
      "Only send USDT on the TRC20 (TRON) network. Sending on any other network will permanently lose your funds.",
    minNote: "Minimum deposit: 5 USDT",
  },
];

const toDateInputValue = (value: Date) => value.toISOString().slice(0, 10);

export default function PropertyActionModal({
  mode,
  property,
  onClose,
  onSuccess,
}: PropertyActionModalProps) {
  const { user, profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const isSale = property.listing_type === "For Sale";
  const isShortLet = property.listing_type === "Short Let";
  const isRent = property.listing_type === "For Rent";
  const isLiveListing = Boolean(property.user_id) && !property.id.startsWith("seed-");

  const [offerForm, setOfferForm] = useState({
    offer_amount: property.price ? String(Math.round(property.price * 0.92)) : "",
    financing_type: "Cash",
    phone: profile?.phone ?? "",
    message: "",
  });

  const [bookingForm, setBookingForm] = useState({
    check_in_date: toDateInputValue(new Date(Date.now() + 86400000)),
    check_out_date: toDateInputValue(new Date(Date.now() + 3 * 86400000)),
    guests_count: "2",
    requested_term_months: "12",
    phone: profile?.phone ?? "",
    notes: "",
  });

  const [protectionForm, setProtectionForm] = useState({
    category: PROTECTION_CATEGORIES[0],
    priority: "medium",
    phone: profile?.phone ?? "",
    summary: "",
    details: "",
  });

  const [escrowForm, setEscrowForm] = useState({
    amount_naira: property.price ? String(property.price) : "",
    phone: profile?.phone ?? "",
    reason: ESCROW_REASONS[0],
    note: "",
  });
  const [escrowStep, setEscrowStep] = useState<"details" | "crypto-pick" | "crypto-address" | "proof">("details");
  const [selectedCrypto, setSelectedCrypto] = useState(CRYPTO_METHODS[0]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOfferForm((current) => ({ ...current, phone: profile?.phone ?? current.phone }));
    setBookingForm((current) => ({ ...current, phone: profile?.phone ?? current.phone }));
    setProtectionForm((current) => ({ ...current, phone: profile?.phone ?? current.phone }));
    setEscrowForm((current) => ({ ...current, phone: profile?.phone ?? current.phone }));
  }, [profile?.phone]);

  const shortLetNights = useMemo(() => {
    if (!isShortLet) return 0;
    const start = new Date(bookingForm.check_in_date);
    const end = new Date(bookingForm.check_out_date);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
    return Number.isFinite(diff) ? Math.max(diff, 0) : 0;
  }, [bookingForm.check_in_date, bookingForm.check_out_date, isShortLet]);

  const bookingTotal = useMemo(() => {
    const serviceFee = Math.round(property.price * (isShortLet ? 0.12 : isRent ? 0.05 : 0.02));
    if (isShortLet && shortLetNights > 0) {
      return shortLetNights * (property.price + serviceFee);
    }
    return property.price + serviceFee;
  }, [isRent, isShortLet, property.price, shortLetNights]);

  const escrowAmount = Number(escrowForm.amount_naira);

  const resolveLandlordId = async () => {
    if (property.user_id) return property.user_id;

    const { data, error } = await supabase
      .from("properties")
      .select("user_id")
      .eq("id", property.id)
      .maybeSingle();

    if (error) throw error;

    return data?.user_id || null;
  };

  const titles: Record<ActionMode, { title: string; subtitle: string }> = {
    offer: {
      title: "Make an Offer",
      subtitle: "Send a serious purchase offer directly into NaijaStays.",
    },
    booking: {
      title: isShortLet ? "Reserve This Stay" : "Request a Rental Booking",
      subtitle: isShortLet
        ? "Lock in your travel dates and let the host review your request."
        : "Submit your preferred move-in plan and let the landlord respond.",
    },
    protection: {
      title: "Open a Protection Case",
      subtitle: "Flag a trust, payment, access, or listing issue for review.",
    },
    escrow: {
      title: "Pay With NaijaStays Escrow",
      subtitle: "Let NaijaStays hold the money first while your request stays documented and protected.",
    },
  };

  const handleOfferSubmit = async () => {
    if (!user) {
      toast.error("Please log in to submit an offer");
      return;
    }
    if (!isLiveListing) {
      toast.info("This demo listing is not yet live for offers.");
      return;
    }

    const amount = Number(offerForm.offer_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid offer amount");
      return;
    }
    if (!offerForm.phone.trim()) {
      toast.error("Add a phone number so the landlord can reach you");
      return;
    }

    setSubmitting(true);
    try {
      const landlordId = await resolveLandlordId();
      if (!landlordId) {
        throw new Error("This listing is missing its landlord connection. Please re-open the listing and try again.");
      }
      if (landlordId === user.id) {
        throw new Error("You cannot submit an offer on your own listing.");
      }

      const payload: TablesInsert<"property_offers"> = {
        property_id: property.id,
        buyer_id: user.id,
        landlord_id: landlordId,
        offer_amount: amount,
        financing_type: offerForm.financing_type,
        phone: offerForm.phone.trim(),
        message: offerForm.message.trim() || null,
      };

      const { error } = await supabase.from("property_offers").insert(payload);
      if (error) throw error;

      toast.success("Offer submitted. The landlord can now review it.");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit offer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingSubmit = async () => {
    if (!user) {
      toast.error("Please log in to send a booking request");
      return;
    }
    if (!isLiveListing) {
      toast.info("This demo listing is not yet live for booking.");
      return;
    }
    if (!bookingForm.phone.trim()) {
      toast.error("Add a phone number so the landlord can confirm your request");
      return;
    }

    if (isShortLet && shortLetNights <= 0) {
      toast.error("Check-out must be after check-in");
      return;
    }

    setSubmitting(true);
    try {
      const landlordId = await resolveLandlordId();
      if (!landlordId) {
        throw new Error("This listing is missing its landlord connection. Please re-open the listing and try again.");
      }

      const requestedMonths = Number(bookingForm.requested_term_months);
      const guestsCount = Number(bookingForm.guests_count);

      const payload: TablesInsert<"booking_requests"> = {
        property_id: property.id,
        guest_id: user.id,
        landlord_id: landlordId,
        booking_type: property.listing_type,
        check_in_date: bookingForm.check_in_date,
        check_out_date: isShortLet ? bookingForm.check_out_date : null,
        guests_count: Math.max(1, guestsCount || 1),
        requested_term_months: isRent ? Math.max(1, requestedMonths || 12) : null,
        phone: bookingForm.phone.trim(),
        notes: bookingForm.notes.trim() || null,
        total_quote: bookingTotal,
      };

      const { error } = await supabase.from("booking_requests").insert(payload);
      if (error) throw error;

      toast.success(
        isShortLet
          ? "Reservation request sent. The host can now confirm your stay."
          : "Rental request sent. The landlord can now review your move-in plan.",
      );
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit booking request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProtectionSubmit = async () => {
    if (!user) {
      toast.error("Please log in to open a protection case");
      return;
    }
    if (!isLiveListing) {
      toast.info("Protection cases only work on live listings.");
      return;
    }
    if (!protectionForm.summary.trim()) {
      toast.error("Add a short summary for the issue");
      return;
    }

    setSubmitting(true);
    try {
      const landlordId = await resolveLandlordId();
      const payload: TablesInsert<"protection_cases"> = {
        property_id: property.id,
        requester_id: user.id,
        landlord_id: landlordId,
        category: protectionForm.category,
        phone: protectionForm.phone.trim() || null,
        summary: protectionForm.summary.trim(),
        details: protectionForm.details.trim() || null,
        priority: protectionForm.priority,
      };

      const { error } = await supabase.from("protection_cases").insert(payload);
      if (error) throw error;

      toast.success("Protection case opened. Admin can now review it.");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to open protection case");
    } finally {
      setSubmitting(false);
    }
  };

  const validateEscrow = () => {
    if (!user) {
      toast.error("Please log in to use NaijaStays escrow");
      return false;
    }
    if (!isLiveListing) {
      toast.info("This demo listing is not yet live for escrow.");
      return false;
    }
    if (!Number.isFinite(escrowAmount) || escrowAmount <= 0) {
      toast.error("Enter a valid escrow amount");
      return false;
    }
    if (!escrowForm.phone.trim()) {
      toast.error("Add your phone number so NaijaStays can follow up");
      return false;
    }
    return true;
  };

  const handleEscrowKorapay = async () => {
    if (!validateEscrow()) return;

    setSubmitting(true);
    try {
      const landlordId = await resolveLandlordId();
      if (!landlordId) {
        throw new Error("This listing is missing its landlord connection. Please re-open the listing and try again.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`${EDGE_FN}?action=initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          payment_kind: "escrow",
          property_id: property.id,
          tenant_id: user!.id,
          landlord_id: landlordId,
          amount: escrowAmount,
          email: user?.email || "noreply@naijastays.com",
          name: profile?.full_name || "NaijaStays User",
          phone: escrowForm.phone.trim(),
          note: `${escrowForm.reason}. ${escrowForm.note}`.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to initiate escrow payment");
      }

      window.location.href = data.checkout_url;
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate escrow payment");
      setSubmitting(false);
    }
  };

  const handleProofFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview((ev.target?.result as string) || null);
    reader.readAsDataURL(file);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Wallet address copied");
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleEscrowCryptoSubmit = async () => {
    if (!validateEscrow()) return;
    if (!proofFile) {
      toast.error("Please upload your payment screenshot");
      return;
    }

    setSubmitting(true);
    try {
      const extension = proofFile.name.split(".").pop();
      const path = `escrow/${user!.id}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, proofFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
      const payload: TablesInsert<"escrow_payments"> = {
        property_id: property.id,
        tenant_id: user!.id,
        landlord_id: (await resolveLandlordId()) || "",
        amount_naira: escrowAmount,
        payment_channel: "crypto",
        payment_method: selectedCrypto.id,
        screenshot_url: urlData.publicUrl,
        payer_name: profile?.full_name || user?.email || "NaijaStays user",
        payer_phone: escrowForm.phone.trim(),
        note: `${escrowForm.reason}. ${escrowForm.note}`.trim(),
        status: "pending",
      };

      if (!payload.landlord_id) {
        throw new Error("This listing is missing its landlord connection. Please re-open the listing and try again.");
      }

      const { error } = await supabase.from("escrow_payments").insert(payload);
      if (error) throw error;

      toast.success("Escrow payment proof submitted. NaijaStays will verify and hold the payment for this listing.");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit escrow proof");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () => {
    if (mode === "offer") return handleOfferSubmit();
    if (mode === "booking") return handleBookingSubmit();
    if (mode === "protection") return handleProtectionSubmit();
    return handleEscrowKorapay();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[30px] border border-primary/10 bg-white shadow-[0_35px_85px_-40px_rgba(21,128,61,0.55)]">
        <div className="flex items-start justify-between rounded-t-[30px] bg-gradient-to-r from-primary to-naija-blue px-6 py-5 text-white">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold">
              {mode === "offer" ? <Tag size={18} /> : <ShieldAlert size={18} />}
              {titles[mode].title}
            </div>
            <p className="mt-1 text-sm text-white/80">{titles[mode].subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6">
          <div className="rounded-2xl border border-border bg-secondary/45 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-primary">Listing</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{property.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {property.city || "Unknown city"}
              {property.state ? `, ${property.state}` : ""} • {formatFullPrice(property.price)}
            </div>
            {!isLiveListing && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                This is currently a demo listing, so requests on it are disabled until a live property record exists.
              </div>
            )}
          </div>

          {mode === "offer" && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Offer amount (₦)</label>
                <input
                  value={offerForm.offer_amount}
                  onChange={(event) => setOfferForm((current) => ({ ...current, offer_amount: event.target.value }))}
                  type="number"
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Funding plan</label>
                <select
                  value={offerForm.financing_type}
                  onChange={(event) => setOfferForm((current) => ({ ...current, financing_type: event.target.value }))}
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                >
                  {FINANCING_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Phone number</label>
                <input
                  value={offerForm.phone}
                  onChange={(event) => setOfferForm((current) => ({ ...current, phone: event.target.value }))}
                  type="tel"
                  placeholder="+234..."
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Message to landlord</label>
                <textarea
                  value={offerForm.message}
                  onChange={(event) => setOfferForm((current) => ({ ...current, message: event.target.value }))}
                  rows={4}
                  placeholder="Share timing, conditions, or anything that helps your offer stand out."
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {mode === "booking" && (
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    {isShortLet ? "Check-in" : "Preferred move-in"}
                  </label>
                  <input
                    value={bookingForm.check_in_date}
                    onChange={(event) => setBookingForm((current) => ({ ...current, check_in_date: event.target.value }))}
                    type="date"
                    className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>

                {isShortLet ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Check-out</label>
                    <input
                      value={bookingForm.check_out_date}
                      onChange={(event) => setBookingForm((current) => ({ ...current, check_out_date: event.target.value }))}
                      type="date"
                      className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Preferred term (months)</label>
                    <input
                      value={bookingForm.requested_term_months}
                      onChange={(event) => setBookingForm((current) => ({ ...current, requested_term_months: event.target.value }))}
                      type="number"
                      min={1}
                      className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    {isShortLet ? "Guests" : "Occupants"}
                  </label>
                  <input
                    value={bookingForm.guests_count}
                    onChange={(event) => setBookingForm((current) => ({ ...current, guests_count: event.target.value }))}
                    type="number"
                    min={1}
                    className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Phone number</label>
                  <input
                    value={bookingForm.phone}
                    onChange={(event) => setBookingForm((current) => ({ ...current, phone: event.target.value }))}
                    type="tel"
                    placeholder="+234..."
                    className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Notes for the landlord</label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  placeholder={
                    isShortLet
                      ? "Arrival time, special requests, or trip details."
                      : "Share your work schedule, expected lease start, or anything important."
                  }
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="rounded-2xl border border-primary/10 bg-secondary p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-primary">Estimated total</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatFullPrice(bookingTotal)}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {isShortLet
                    ? shortLetNights > 0
                      ? `${shortLetNights} night${shortLetNights === 1 ? "" : "s"} requested`
                      : "Choose valid dates to calculate the stay total"
                    : `Based on the listed price for ${property.listing_type.toLowerCase()}`}
                </div>
              </div>
            </div>
          )}

          {mode === "escrow" && (
            <div className="mt-5 space-y-4">
              {escrowStep === "details" && (
                <>
                  <div className="rounded-2xl border border-primary/15 bg-[linear-gradient(180deg,rgba(240,253,244,0.9),rgba(255,255,255,1))] p-4 text-sm text-muted-foreground">
                    NaijaStays can receive this payment first, verify it, and keep a clear record before the landlord gets access.
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Amount to place in escrow (₦)</label>
                    <input
                      value={escrowForm.amount_naira}
                      onChange={(event) => setEscrowForm((current) => ({ ...current, amount_naira: event.target.value }))}
                      type="number"
                      className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Phone number</label>
                    <input
                      value={escrowForm.phone}
                      onChange={(event) => setEscrowForm((current) => ({ ...current, phone: event.target.value }))}
                      type="tel"
                      placeholder="+234..."
                      className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Why use escrow?</label>
                    <select
                      value={escrowForm.reason}
                      onChange={(event) => setEscrowForm((current) => ({ ...current, reason: event.target.value }))}
                      className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                    >
                      {ESCROW_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Extra note for NaijaStays</label>
                    <textarea
                      value={escrowForm.note}
                      onChange={(event) => setEscrowForm((current) => ({ ...current, note: event.target.value }))}
                      rows={4}
                      placeholder="Add expected dates, special terms, or what you want our team to watch out for."
                      className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={handleEscrowKorapay}
                      disabled={submitting || !isLiveListing}
                      className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {submitting ? "Redirecting..." : "Pay with Korapay"}
                    </button>
                    <button
                      onClick={() => {
                        if (!validateEscrow()) return;
                        setEscrowStep("crypto-pick");
                      }}
                      className="rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      Pay with crypto
                    </button>
                  </div>
                </>
              )}

              {escrowStep === "crypto-pick" && (
                <>
                  <p className="text-sm text-muted-foreground">Pick the crypto payment option you want to use for this escrow.</p>
                  <div className="space-y-3">
                    {CRYPTO_METHODS.map((crypto) => (
                      <button
                        key={crypto.id}
                        onClick={() => {
                          setSelectedCrypto(crypto);
                          setEscrowStep("crypto-address");
                        }}
                        className="w-full rounded-2xl border border-border px-4 py-4 text-left transition hover:border-primary/30 hover:bg-secondary/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                            <Wallet size={17} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{crypto.name}</div>
                            <div className="text-xs text-muted-foreground">{crypto.network}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setEscrowStep("details")}
                    className="w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    Back
                  </button>
                </>
              )}

              {escrowStep === "crypto-address" && (
                <>
                  {selectedCrypto.warning && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
                      {selectedCrypto.warning}
                    </div>
                  )}

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Send the crypto equivalent of <strong>{formatFullPrice(escrowAmount || 0)}</strong>, then upload the proof so NaijaStays can verify and hold it.
                  </div>

                  <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-primary">Wallet address</div>
                    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-white p-3">
                      <div className="flex-1 break-all text-xs font-mono text-foreground">{selectedCrypto.address}</div>
                      <button
                        onClick={() => handleCopy(selectedCrypto.address)}
                        className="rounded-xl bg-primary/10 p-2 text-primary transition hover:bg-primary/20"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    {copied && <div className="mt-2 text-xs font-medium text-green-700">Wallet copied to clipboard</div>}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => setEscrowStep("crypto-pick")}
                      className="rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setEscrowStep("proof")}
                      className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      I have paid
                    </button>
                  </div>
                </>
              )}

              {escrowStep === "proof" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Upload your payment screenshot. NaijaStays will verify it manually and keep the payment in escrow.
                  </p>

                  <label
                    className={`block w-full cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
                      proofPreview ? "border-primary bg-secondary/50" : "border-border hover:border-primary/30"
                    }`}
                  >
                    {proofPreview ? (
                      <img src={proofPreview} alt="Payment proof" className="mx-auto max-h-56 rounded-xl object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Upload size={22} />
                        <div className="text-sm font-medium">Tap to upload your payment proof</div>
                        <div className="text-xs">PNG or JPG works best</div>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleProofFile} className="hidden" />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => setEscrowStep("crypto-address")}
                      className="rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleEscrowCryptoSubmit}
                      disabled={submitting || !proofFile}
                      className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {submitting ? "Submitting..." : "Submit escrow proof"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {mode === "protection" && (
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Issue category</label>
                  <select
                    value={protectionForm.category}
                    onChange={(event) => setProtectionForm((current) => ({ ...current, category: event.target.value }))}
                    className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                  >
                    {PROTECTION_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Priority</label>
                  <select
                    value={protectionForm.priority}
                    onChange={(event) => setProtectionForm((current) => ({ ...current, priority: event.target.value }))}
                    className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Phone number</label>
                <input
                  value={protectionForm.phone}
                  onChange={(event) => setProtectionForm((current) => ({ ...current, phone: event.target.value }))}
                  type="tel"
                  placeholder="+234..."
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Short summary</label>
                <input
                  value={protectionForm.summary}
                  onChange={(event) => setProtectionForm((current) => ({ ...current, summary: event.target.value }))}
                  placeholder="Example: Listing photos did not match the property."
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Full details</label>
                <textarea
                  value={protectionForm.details}
                  onChange={(event) => setProtectionForm((current) => ({ ...current, details: event.target.value }))}
                  rows={5}
                  placeholder="Share exactly what happened, when it happened, and what kind of help you need."
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="rounded-2xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">
                Cases opened here land in the admin workspace, where the team can move them from open to investigating to resolved.
              </div>
            </div>
          )}

          {mode !== "escrow" && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || !isLiveListing}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" />
                    Sending...
                  </span>
                ) : mode === "offer" ? (
                  "Submit offer"
                ) : mode === "booking" ? (
                  "Send booking request"
                ) : (
                  "Open case"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
