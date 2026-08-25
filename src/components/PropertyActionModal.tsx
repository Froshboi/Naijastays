import { useState } from "react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Property } from "@/lib/data";
import { toast } from "sonner";

interface Props {
  mode: "offer" | "booking" | "protection" | "escrow";
  property: Property;
  onClose: () => void;
}

export default function PropertyActionModal({ mode, property, onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    offerAmount: "",
    financingType: "cash",
    moveInDate: "",
    moveOutDate: "",
    guests: "1",
    termMonths: "",
    phone: "",
    message: "",
    caseType: "payment_dispute",
    description: "",
    escrowAmount: "",
    payerName: "",
    payerPhone: "",
    paymentChannel: "korapay",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please log in first"); return; }
    setLoading(true);
    try {
      if (mode === "offer") {
        const { error } = await supabase.from("property_offers").insert({
          property_id: property.id,
          buyer_id: user.id,
          offer_amount: parseInt(form.offerAmount) || 0,
          financing_type: form.financingType,
          phone: form.phone,
          message: form.message,
          status: "pending",
        });
        if (error) throw error;
        toast.success("Offer submitted! The landlord will review it.");
      } else if (mode === "booking") {
        const { error } = await supabase.from("booking_requests").insert({
          property_id: property.id,
          guest_id: user.id,
          check_in_date: form.moveInDate,
          check_out_date: form.moveOutDate || null,
          guests_count: parseInt(form.guests) || 1,
          requested_term_months: form.termMonths ? parseInt(form.termMonths) : null,
          total_quote: property.price,
          phone: form.phone,
          notes: form.message,
          booking_type: property.listing_type === "Short Let" ? "short_let" : "rental",
          status: "pending",
        });
        if (error) throw error;
        toast.success("Booking request sent! The landlord will respond shortly.");
      } else if (mode === "protection") {
        const { error } = await supabase.from("protection_cases").insert({
          property_id: property.id,
          reporter_id: user.id,
          case_type: form.caseType,
          description: form.description,
          status: "open",
        });
        if (error) throw error;
        toast.success("Protection case filed. Our team will investigate.");
      } else if (mode === "escrow") {
        const { error } = await supabase.from("escrow_payments").insert({
          property_id: property.id,
          tenant_id: user.id,
          landlord_id: property.user_id,
          amount_naira: parseInt(form.escrowAmount) || 0,
          payer_name: form.payerName,
          payer_phone: form.payerPhone,
          payment_channel: form.paymentChannel,
          status: "pending",
        });
        if (error) throw error;
        toast.success("Escrow request created. Complete payment to lock it in.");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<string, string> = {
    offer: "Make an Offer",
    booking: property.listing_type === "Short Let" ? "Request a Short-Let Booking" : "Request a Rental Booking",
    protection: "File a Protection Case",
    escrow: "Pay via NaijaStays Escrow",
  };

  const subtitles: Record<string, string> = {
    offer: "Submit your offer terms and let the landlord respond.",
    booking: "Submit your preferred move-in plan and let the landlord respond.",
    protection: "Describe the issue and our team will investigate.",
    escrow: "Secure your payment with NaijaStays escrow protection.",
  };

  return (
    <div className="fixed inset-0 bg-foreground/45 z-50 flex items-end sm:items-center justify-center overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-[520px] max-h-[92dvh] overflow-y-auto shadow-xl my-auto sm:my-0">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-5 sm:px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display text-lg font-semibold">{titles[mode]}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitles[mode]}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 ml-3"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Listing preview */}
          <div className="rounded-xl border border-border bg-secondary/40 p-3.5 flex items-center gap-3">
            <img src={property.images?.[0] || "/placeholder.svg"} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-muted" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Listing</p>
              <p className="text-sm font-semibold text-foreground truncate">{property.title}</p>
              <p className="text-xs text-muted-foreground truncate">{property.city}, {property.state} · ₦{property.price.toLocaleString()}</p>
            </div>
          </div>

          {mode === "offer" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Offer amount (₦)</label>
                  <input name="offerAmount" value={form.offerAmount} onChange={handleChange} type="number" required placeholder="e.g. 40000000"
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Financing</label>
                  <select name="financingType" value={form.financingType} onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card">
                    <option value="cash">Cash</option>
                    <option value="mortgage">Mortgage</option>
                    <option value="installment">Installment</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Phone number</label>
                <input name="phone" value={form.phone} onChange={handleChange} type="tel" required placeholder="+234..."
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Message to landlord</label>
                <textarea name="message" value={form.message} onChange={handleChange} rows={3} placeholder="Why you're interested, preferred timeline, questions..."
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card resize-none" />
              </div>
            </>
          )}

          {mode === "booking" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    {property.listing_type === "Short Let" ? "Check-in" : "Preferred move-in"}
                  </label>
                  <input name="moveInDate" value={form.moveInDate} onChange={handleChange} type="date" required
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    {property.listing_type === "Short Let" ? "Check-out" : "Preferred move-out"}
                  </label>
                  <input name="moveOutDate" value={form.moveOutDate} onChange={handleChange} type="date"
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Guests</label>
                  <select name="guests" value={form.guests} onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card">
                    {[1,2,3,4,5,6,7,8].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
                    ))}
                  </select>
                </div>
                {property.listing_type === "For Rent" && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Term (months)</label>
                    <input name="termMonths" value={form.termMonths} onChange={handleChange} type="number" placeholder="12"
                      className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Phone number</label>
                <input name="phone" value={form.phone} onChange={handleChange} type="tel" required placeholder="+234..."
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Notes for the landlord</label>
                <textarea name="message" value={form.message} onChange={handleChange} rows={3} placeholder="Share your work schedule, expected lease start, or anything important."
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card resize-none" />
              </div>
            </>
          )}

          {mode === "protection" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Case type</label>
                <select name="caseType" value={form.caseType} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card">
                  <option value="payment_dispute">Payment dispute</option>
                  <option value="access_issue">Access / key issue</option>
                  <option value="misrepresentation">Property misrepresentation</option>
                  <option value="safety_concern">Safety concern</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Describe what happened</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={4} required placeholder="Be as detailed as possible. Include dates, amounts, and what you expected vs what happened."
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card resize-none" />
              </div>
            </>
          )}

          {mode === "escrow" && (
            <>
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3.5 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your payment is held securely by NaijaStays until both parties confirm the deal is complete. Funds are only released when both sides agree.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Escrow amount (₦)</label>
                <input name="escrowAmount" value={form.escrowAmount} onChange={handleChange} type="number" required placeholder="Amount to hold in escrow"
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payer name</label>
                  <input name="payerName" value={form.payerName} onChange={handleChange} placeholder="Full name"
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payer phone</label>
                  <input name="payerPhone" value={form.payerPhone} onChange={handleChange} type="tel" placeholder="+234..."
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payment channel</label>
                <select name="paymentChannel" value={form.paymentChannel} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card">
                  <option value="korapay">Korapay (card / transfer)</option>
                  <option value="bank_transfer">Direct bank transfer</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}