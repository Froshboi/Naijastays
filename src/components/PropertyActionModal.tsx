import { useState, useEffect, useMemo } from "react";
import { 
  X, Loader2, ShieldCheck, Calendar, Users, Phone, 
  MessageSquare, Banknote, BedDouble, Clock, MapPin, Check 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Property } from "@/lib/data";
import { formatNaira, getListingPrice, getRentalPricingSummary } from "@/lib/pricing";
import { toast } from "sonner";
import { notifyUser } from "@/lib/notifications";

interface Props {
  mode: "offer" | "booking" | "protection" | "escrow";
  property: Property;
  onClose: () => void;
}

export default function PropertyActionModal({ mode, property, onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomLoadError, setRoomLoadError] = useState<string | null>(null);
  const listingPrice = getListingPrice(property);
  const rentalPricing = getRentalPricingSummary(property);

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
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Fetch room types when booking a hotel
  useEffect(() => {
    if (mode !== "booking" || property.property_type !== "Hotel") {
      setRoomTypes([]);
      setSelectedRoom(null);
      setRoomLoading(false);
      setRoomLoadError(null);
      return;
    }

    setRoomLoading(true);
    setRoomLoadError(null);
    setSelectedRoom(null);

    supabase
      .from("property_room_types")
      .select("*")
      .eq("property_id", property.id)
      .then(({ data, error }) => {
        if (error) {
          setRoomLoadError("Room options are not available yet. The booking can still be sent with the listing rate.");
          setRoomTypes([]);
          return;
        }
        setRoomTypes(data || []);
      })
      .finally(() => setRoomLoading(false));
  }, [mode, property.id, property.property_type]);

  const nights = useMemo(() => {
    if (!form.moveInDate || !form.moveOutDate) return 0;
    const start = new Date(form.moveInDate);
    const end = new Date(form.moveOutDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [form.moveInDate, form.moveOutDate]);

  const totalQuote = useMemo(() => {
    if (mode !== "booking") return 0;
    if (property.property_type === "Hotel" && selectedRoom) {
      return selectedRoom.price_per_night * nights;
    }
    if (property.property_type === "Hotel") {
      return property.price * nights;
    }
    if (property.listing_type === "Short Let") {
      return property.price * nights;
    }
    return rentalPricing?.moveInTotal || rentalPricing?.renewalRate || property.price;
  }, [mode, property, selectedRoom, nights, rentalPricing?.moveInTotal, rentalPricing?.renewalRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please log in first"); return; }
    setLoading(true);

    try {
      if (mode === "offer") {
        const { error } = await supabase.from("property_offers").insert({
          property_id: property.id,
          buyer_id: user.id,
          landlord_id: property.user_id,
          offer_amount: parseInt(form.offerAmount) || 0,
          financing_type: form.financingType,
          phone: form.phone,
          message: form.message,
          status: "pending",
        });
        if (error) throw error;
        toast.success("Offer submitted! The landlord will review it.");

        if (property?.user_id) {
          await notifyUser(
            property.user_id,
            "New Offer Received",
            `Someone offered ${formatNaira(parseInt(form.offerAmount) || 0)} for ${property.title}. Review it in your dashboard.`,
            "offer",
            "view_offer",
            { property_id: property.id }
          );
        }
      } 
      
      else if (mode === "booking") {
        if (!form.moveInDate) throw new Error("Please select a move-in date");
        if (property.property_type === "Hotel" && roomTypes.length > 0 && !selectedRoom) {
          throw new Error("Please select a room type");
        }
        if ((property.listing_type === "Short Let" || property.property_type === "Hotel") && !form.moveOutDate) {
          throw new Error("Please select a check-out date");
        }
        if (property.listing_type === "For Rent" && !form.termMonths) {
          throw new Error("Please specify the lease term in months");
        }

        const { data: booking, error } = await supabase.from("booking_requests").insert({
          property_id: property.id,
          guest_id: user.id,
          landlord_id: property.user_id,
          room_type_id: property.property_type === "Hotel" && selectedRoom ? selectedRoom.id : null,
          booking_type: property.listing_type === "Short Let" || property.property_type === "Hotel" ? "short_let" : "rental",
          check_in_date: form.moveInDate,
          check_out_date: (property.listing_type === "Short Let" || property.property_type === "Hotel") ? form.moveOutDate : null,
          guests_count: parseInt(form.guests) || 1,
          requested_term_months: property.listing_type === "For Rent" ? (parseInt(form.termMonths) || null) : null,
          total_quote: totalQuote,
          phone: form.phone,
          notes: form.message,
          status: "pending",
        }).select("id").single();
        if (error) throw error;

        if (property?.user_id) {
          const requestLabel = property.property_type === "Hotel" ? "room booking" : isRental ? "rental booking" : "short-let booking";
          await notifyUser(
            property.user_id,
            "New booking request",
            `A tenant sent a ${requestLabel} request for ${property.title}. Review it before confirming.`,
            "booking",
            "review_booking",
            { property_id: property.id, booking_id: booking?.id }
          );
        }

        toast.success(
          property.property_type === "Hotel" 
            ? "Booking request sent for your selected room!" 
            : "Booking request sent! The landlord will respond shortly."
        );
      } 
      
      else if (mode === "protection") {
        const { error } = await supabase.from("protection_cases").insert({
          property_id: property.id,
          requester_id: user.id,
          landlord_id: property.user_id,
          category: form.caseType,
          summary: form.description,
          details: form.description,
          status: "open",
        });
        if (error) throw error;
        toast.success("Protection case filed. Our team will investigate.");
      } 
      
      else if (mode === "escrow") {
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

  const modeLabel = {
    offer: "Make an Offer",
    booking: property.property_type === "Hotel" ? "Book a Room" : "Request Booking",
    protection: "File Protection Case",
    escrow: "Pay via Escrow",
  }[mode];

  const isShortStay = property.listing_type === "Short Let" || property.property_type === "Hotel";
  const isRental = property.listing_type === "For Rent";

  return (
    <div className="fixed inset-0 bg-foreground/45 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-[520px] max-h-[calc(100dvh-0.75rem)] sm:max-h-[92dvh] overflow-hidden shadow-xl flex flex-col">
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-card border-b border-border z-10">
          <div className="px-5 sm:px-6 py-4 flex items-center gap-3">
            <img 
              src={property.images?.[0] || "/placeholder.svg"} 
              alt="" 
              className="w-12 h-12 rounded-lg object-cover bg-muted shrink-0" 
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {modeLabel}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {property.property_type} · {property.listing_type}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground truncate">{property.title}</h3>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <MapPin size={10} />
                {property.city}, {property.state} · {listingPrice.formatted}{listingPrice.label}
              </p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-6">

          {/* ==================== OFFER ==================== */}
          {mode === "offer" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Offer amount (₦)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">₦</span>
                    <input 
                      name="offerAmount" value={form.offerAmount} onChange={handleChange} 
                      type="number" required min="1" placeholder="40,000,000"
                      className="w-full pl-7 pr-3 py-2.5 border border-border rounded-lg text-sm bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                    />
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Financing</label>
                  <select 
                    name="financingType" value={form.financingType} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-card"
                  >
                    <option value="cash">Cash</option>
                    <option value="mortgage">Mortgage</option>
                    <option value="installment">Installment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Phone number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    name="phone" value={form.phone} onChange={handleChange} 
                    type="tel" required placeholder="+234 801 234 5678"
                    className="w-full pl-8 pr-3 py-2.5 border border-border rounded-lg text-sm bg-card" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Message to landlord</label>
                <textarea 
                  name="message" value={form.message} onChange={handleChange} 
                  rows={3} placeholder="Why you're interested, preferred timeline, questions..."
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card resize-none" 
                />
              </div>
            </div>
          )}

          {/* ==================== BOOKING ==================== */}
          {mode === "booking" && (
            <div className="space-y-4">
              
              {/* HOTEL: Room Selection */}
              {property.property_type === "Hotel" && (
                <div className="space-y-3">
                  {!selectedRoom ? (
                    <>
                      <label className="block text-xs font-semibold text-muted-foreground">Select a Room</label>
                      {roomLoading && <p className="text-sm text-muted-foreground">Loading available rooms...</p>}
                      {!roomLoading && roomLoadError && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                          {roomLoadError}
                        </div>
                      )}
                      {!roomLoading && !roomLoadError && roomTypes.length === 0 && (
                        <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs text-primary">
                          No room types have been added yet. The request will use the hotel base rate of {listingPrice.formatted}/night.
                        </div>
                      )}
                      <div className="space-y-2">
                        {roomTypes.map((room) => (
                          <button
                            key={room.id}
                            type="button"
                            onClick={() => setSelectedRoom(room)}
                            className="w-full text-left border border-border rounded-xl p-3 hover:border-primary hover:bg-primary/5 transition-all"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-semibold">{room.name}</h4>
                              <span className="text-sm font-bold text-primary">
                                {formatNaira(room.price_per_night)}<span className="text-[10px] font-normal text-muted-foreground">/night</span>
                              </span>
                            </div>
                            {room.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{room.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1"><Users size={11} /> Max {room.max_guests}</span>
                              <span className="flex items-center gap-1"><BedDouble size={11} /> {room.bed_count} bed{room.bed_count > 1 ? 's' : ''}</span>
                              <span className="flex items-center gap-1"><ShieldCheck size={11} /> {room.cancellation_policy}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="border border-primary rounded-xl p-3 bg-primary/5 flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">Selected Room</p>
                        <h4 className="text-sm font-semibold">{selectedRoom.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {formatNaira(selectedRoom.price_per_night)}/night · Max {selectedRoom.max_guests} guests
                        </p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setSelectedRoom(null)} 
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    {isShortStay ? "Check-in" : "Move-in date"} *
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      name="moveInDate" value={form.moveInDate} onChange={handleChange} 
                      type="date" required
                      className="w-full pl-8 pr-2 py-2.5 border border-border rounded-lg text-sm bg-card" 
                    />
                  </div>
                </div>

                {isShortStay ? (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Check-out *</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        name="moveOutDate" value={form.moveOutDate} onChange={handleChange} 
                        type="date" required
                        className="w-full pl-8 pr-2 py-2.5 border border-border rounded-lg text-sm bg-card" 
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Lease term (months) *</label>
                    <div className="relative">
                      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        name="termMonths" value={form.termMonths} onChange={handleChange} 
                        type="number" min="1" placeholder="12" required
                        className="w-full pl-8 pr-3 py-2.5 border border-border rounded-lg text-sm bg-card" 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Guests / Occupants */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  {isRental ? "Occupants" : "Guests"}
                </label>
                <div className="relative">
                  <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select 
                    name="guests" value={form.guests} onChange={handleChange}
                    className="w-full pl-8 pr-3 py-2.5 border border-border rounded-lg text-sm bg-card appearance-none"
                  >
                    {Array.from({ 
                      length: property.property_type === "Hotel" && selectedRoom ? selectedRoom.max_guests : 8 
                    }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price Summary */}
              {isShortStay && nights > 0 && (
                <div className="rounded-lg bg-secondary/50 border border-border p-3 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {formatNaira(property.property_type === "Hotel" && selectedRoom ? selectedRoom.price_per_night : property.price)} × {nights} night{nights > 1 ? 's' : ''}
                    </span>
                    <span className="font-bold">{formatNaira(totalQuote)}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatNaira(totalQuote)}</span>
                  </div>
                </div>
              )}

              {isRental && rentalPricing && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-2">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Total move-in payment</span>
                    <span className="font-bold text-foreground">
                      {rentalPricing.moveInTotal ? formatNaira(rentalPricing.moveInTotal) : "Confirm with landlord"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Renewal rate</span>
                    <span className="font-bold text-primary">{formatNaira(rentalPricing.renewalRate)} {rentalPricing.label}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Phone number *</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    name="phone" value={form.phone} onChange={handleChange} 
                    type="tel" required placeholder="+234 801 234 5678"
                    className="w-full pl-8 pr-3 py-2.5 border border-border rounded-lg text-sm bg-card" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  {isRental ? "Notes for landlord" : "Special requests"}
                </label>
                <div className="relative">
                  <MessageSquare size={14} className="absolute left-3 top-3 text-muted-foreground" />
                  <textarea 
                    name="message" value={form.message} onChange={handleChange} 
                    rows={3} 
                    placeholder={isRental ? "Work schedule, pet policy, anything important…" : "Any special requests?"}
                    className="w-full pl-8 pr-3 py-2.5 border border-border rounded-lg text-sm bg-card resize-none" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==================== PROTECTION ==================== */}
          {mode === "protection" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  This creates a formal case that our team will review. Be as detailed as possible.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Case type *</label>
                <select 
                  name="caseType" value={form.caseType} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-card"
                >
                  <option value="payment_dispute">Payment dispute</option>
                  <option value="access_issue">Access / key issue</option>
                  <option value="misrepresentation">Property misrepresentation</option>
                  <option value="safety_concern">Safety concern</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Describe what happened *</label>
                <textarea 
                  name="description" value={form.description} onChange={handleChange} 
                  rows={4} required
                  placeholder="Include dates, amounts, and what you expected vs what happened."
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card resize-none" 
                />
              </div>
            </div>
          )}

          {/* ==================== ESCROW ==================== */}
          {mode === "escrow" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3.5 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your payment is held securely by NaijaStays until both parties confirm the deal is complete.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Escrow amount (₦) *</label>
                <div className="relative">
                  <Banknote size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    name="escrowAmount" value={form.escrowAmount} onChange={handleChange} 
                    type="number" required min="1" placeholder="Amount to hold in escrow"
                    className="w-full pl-8 pr-3 py-2.5 border border-border rounded-lg text-sm bg-card" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payer name *</label>
                  <input 
                    name="payerName" value={form.payerName} onChange={handleChange} 
                    placeholder="Full name" required
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-card" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payer phone *</label>
                  <input 
                    name="payerPhone" value={form.payerPhone} onChange={handleChange} 
                    type="tel" placeholder="+234..." required
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-card" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payment channel</label>
                <select 
                  name="paymentChannel" value={form.paymentChannel} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-card"
                >
                  <option value="korapay">Korapay (card / transfer)</option>
                  <option value="bank_transfer">Direct bank transfer</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bottom-0 w-full py-3.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_18px_38px_-18px_rgba(21,128,61,0.8)]"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Processing…</>
            ) : mode === "offer" ? (
              "Submit Offer"
            ) : mode === "booking" ? (
              property.property_type === "Hotel" ? "Request Room Booking" : "Send Booking Request"
            ) : mode === "protection" ? (
              "File Case"
            ) : (
              "Create Escrow"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
