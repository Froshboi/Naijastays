import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Property, formatFullPrice } from "@/lib/data";
import {
  Trash2, Plus, Eye, ArrowLeft, Megaphone, X,
  Star, Zap, TrendingUp, CheckCircle, Wallet, Banknote,
  Bitcoin, ArrowDownToLine, History, Loader2, Bell,
  Copy, Upload, Pencil
} from "lucide-react";
import { toast } from "sonner";
import ListPropertyForm from "./ListPropertyForm";
import { notifyUser, sendEmail } from "@/lib/notifications";

const EDGE_FN = "https://lvntcsobqtgtbnudiwmv.supabase.co/functions/v1/korapay-webhook";

const PROMOTE_PLANS = [
  { id: "basic", name: "Basic Boost", naira: 5000, usdt: null, duration: 7, label: "7 days", perks: ["Top of search results", "Bold listing badge"], icon: Zap, color: "border-orange-300", highlight: false },
  { id: "pro", name: "Pro Spotlight", naira: 12000, usdt: 8, duration: 14, label: "14 days", perks: ["Featured on homepage", "Top of search results", "🔥 Hot Property badge", "WhatsApp enquiry button"], icon: Star, color: "border-primary", highlight: true },
  { id: "elite", name: "Elite Listing", naira: 25000, usdt: 16, duration: 30, label: "30 days", perks: ["Everything in Pro", "Social media feature", "Priority support", "Analytics report"], icon: TrendingUp, color: "border-purple-400", highlight: false },
];

type OfferRecord = Tables<"property_offers">;
type BookingRequestRecord = Tables<"booking_requests">;
type ProtectionCaseRecord = Tables<"protection_cases">;
type EngagementEventRecord = Tables<"property_engagement_events">;
type EscrowPaymentRecord = Tables<"escrow_payments">;
type LandlordReviewRecord = Tables<"landlord_reviews">;

interface BalanceData {
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
}

interface BalanceTransaction {
  id: string;
  landlord_id: string;
  booking_id: string | null;
  property_id: string;
  amount: number;
  type: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  properties?: { title: string } | null;
}

interface PayoutRequest {
  id: string;
  landlord_id: string;
  amount: number;
  status: string;
  method: string | null;
  account_details: any;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
const copyBookingValue = async (label: string, value: string) => {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
};
const CRYPTO_METHODS = [
  { id: "solana", name: "Solana (SOL)", address: "4MN7ZWDAu81U6UVttyRXkfMixXhUxvYnai3KP2yaqe9K", network: "Solana Network", warning: null, minNote: null },
  { id: "btc", name: "Bitcoin (BTC)", address: "bc1qa6ne3p9484t66chvk8pkt48pgkzm70m5rmrzrr", network: "Bitcoin Network", warning: null, minNote: null },
  { id: "usdt", name: "USDT (TRC20)", address: "TSxQCMXA58QkCfTLwbRHQ2F9VWKEh57Hi6", network: "TRON Network (TRC20) only", warning: "⚠️ Only send USDT on the TRC20 (TRON) network. Sending on any other network will result in permanent loss of funds.", minNote: "Minimum deposit: 5 USDT" },
];

function PromoteModal({ property, userId, userEmail, userName, onClose }: any) {
  const [step, setStep] = useState<"plan" | "category" | "crypto-pick" | "crypto-address" | "proof">("plan");
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [selectedCrypto, setSelectedCrypto] = useState(CRYPTO_METHODS[0]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const plan = PROMOTE_PLANS.find((p) => p.id === selectedPlan)!;

  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); toast.success("Address copied!"); setTimeout(() => setCopied(false), 2000); };
  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setScreenshot(file); const r = new FileReader(); r.onload = (ev) => setScreenshotPreview(ev.target?.result as string); r.readAsDataURL(file); };

  const handleKorapay = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${EDGE_FN}?action=initialize`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }, body: JSON.stringify({ property_id: property.id, plan: selectedPlan, user_id: userId, amount: plan.naira, email: userEmail || "noreply@naijastays.com", name: userName || "NaijaStays User" }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.checkout_url;
    } catch (err: any) { toast.error(err.message || "Failed to initiate payment"); setLoading(false); }
  };

  const handleCryptoSubmit = async () => {
    if (!screenshot) { toast.error("Please upload payment screenshot"); return; }
    setLoading(true);
    try {
      const ext = screenshot.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, screenshot);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
      await (supabase as any).from("promotion_payments").insert({ user_id: userId, property_id: property.id, plan: selectedPlan, amount_naira: plan.naira, payment_method: selectedCrypto.id, screenshot_url: urlData.publicUrl, status: "pending" });
      toast.success("🎉 Crypto payment submitted! We'll verify within 1 hour.");
      onClose();
    } catch (err: any) { toast.error(err.message || "Failed to submit"); } finally { setLoading(false); }
  };

  const stepTitle = { plan: "Choose a Plan", category: "How do you want to pay?", "crypto-pick": "Choose Crypto", "crypto-address": "Send Payment", proof: "Upload Proof" }[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-primary to-naija-blue px-6 py-5 flex items-start justify-between shrink-0">
          <div><div className="flex items-center gap-2 text-white font-bold text-lg"><Megaphone size={20} /> {stepTitle}</div><p className="text-white/80 text-sm mt-0.5 truncate max-w-[280px]">{property.title}</p></div>
          <button onClick={onClose} className="text-white/70 hover:text-white mt-0.5"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {step === "plan" && (
            <div className="p-6 space-y-3">
              {PROMOTE_PLANS.map((p) => { const Icon = p.icon; return (
                <button key={p.id} onClick={() => setSelectedPlan(p.id)} className={`w-full text-left rounded-xl border-2 px-4 py-4 transition-all ${selectedPlan === p.id ? p.color + " bg-secondary" : "border-border bg-card hover:border-gray-300"}`}>
                  <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2 font-semibold text-foreground"><Icon size={16} className={selectedPlan === p.id ? "text-primary" : "text-muted-foreground"} /> {p.name} {p.highlight && <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">POPULAR</span>}</div><div className="text-right"><div className="font-bold text-foreground">₦{p.naira.toLocaleString()}</div><div className="text-xs text-muted-foreground">{p.label}</div></div></div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">{p.perks.map((perk) => (<span key={perk} className="flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle size={10} className="text-green-500 shrink-0" /> {perk}</span>))}</div>
                  {p.usdt && <div className="mt-2 text-xs text-muted-foreground">≈ {p.usdt} USDT</div>}
                </button>
              ); })}
              <button onClick={() => setStep("category")} className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90">Continue →</button>
            </div>
          )}
          {step === "category" && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Promoting <strong>{plan.name}</strong> — <strong>₦{plan.naira.toLocaleString()}</strong> / {plan.label}</p>
              <button onClick={handleKorapay} disabled={loading} className="w-full text-left rounded-xl border-2 border-primary bg-secondary px-5 py-5 transition-all hover:bg-secondary/70 disabled:opacity-50"><div className="flex items-center gap-4"><div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">₦</div><div><div className="font-bold text-foreground">Pay in Naira</div><div className="text-xs text-muted-foreground mt-0.5">Card or bank transfer via Korapay — instant activation</div></div></div>{loading && <p className="text-xs text-primary mt-3 font-semibold">Redirecting to checkout…</p>}</button>
              <button onClick={() => setStep("crypto-pick")} className="w-full text-left rounded-xl border-2 border-border px-5 py-5 transition-all hover:border-gray-400"><div className="flex items-center gap-4"><div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Wallet size={20} className="text-gray-600" /></div><div><div className="font-bold text-foreground">Pay in Crypto</div><div className="text-xs text-muted-foreground mt-0.5">Bitcoin, Solana, or USDT (TRC20) — manual verification within 1 hour</div></div></div></button>
              <button onClick={() => setStep("plan")} className="w-full py-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-gray-50">← Back</button>
            </div>
          )}
          {step === "crypto-pick" && (
            <div className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground mb-2">Select your preferred cryptocurrency:</p>
              {CRYPTO_METHODS.map((crypto) => { const isUsdtBasic = crypto.id === "usdt" && selectedPlan === "basic"; return (
                <button key={crypto.id} disabled={isUsdtBasic} onClick={() => { if (!isUsdtBasic) { setSelectedCrypto(crypto); setStep("crypto-address"); } }} className={`w-full text-left rounded-xl border-2 px-4 py-4 transition-all ${isUsdtBasic ? "border-border opacity-40 cursor-not-allowed" : "border-border hover:border-primary hover:bg-secondary"}`}>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center"><Wallet size={16} className="text-gray-600" /></div><div><div className="font-semibold text-sm text-foreground">{crypto.name}</div><div className="text-xs text-muted-foreground">{crypto.network}</div></div></div>{crypto.minNote && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{isUsdtBasic ? "Min. 5 USDT — upgrade plan" : crypto.minNote}</span>}</div>
                </button>
              ); })}
              <button onClick={() => setStep("category")} className="w-full py-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-gray-50">← Back</button>
            </div>
          )}
          {step === "crypto-address" && (
            <div className="p-6 space-y-4">
              {selectedCrypto.warning && <div className="bg-red-50 border border-red-200 rounded-xl p-4"><p className="text-xs text-red-700 leading-relaxed font-medium">{selectedCrypto.warning}</p></div>}
              {selectedCrypto.minNote && <div className="bg-blue-50 border border-blue-200 rounded-xl p-3"><p className="text-xs font-bold text-blue-700">{selectedCrypto.minNote}</p></div>}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-xs font-bold text-amber-800 mb-1">{plan.usdt ? `Send ≈ ${plan.usdt} USDT equivalent` : `Send equivalent of ₦${plan.naira.toLocaleString()}`}</p><p className="text-xs text-amber-700">After sending, tap "I've sent payment" and upload your screenshot.</p></div>
              <div><p className="text-xs font-bold text-foreground mb-2">{selectedCrypto.name} Wallet Address</p><div className="bg-gray-50 border border-border rounded-xl p-3 flex items-center gap-2"><p className="text-xs font-mono text-foreground flex-1 break-all">{selectedCrypto.address}</p><button onClick={() => handleCopy(selectedCrypto.address)} className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"><Copy size={14} /></button></div>{copied && <p className="text-xs text-green-600 mt-1 font-semibold">✓ Copied to clipboard</p>}</div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs text-muted-foreground"><p className="font-semibold text-foreground">Payment summary</p><div className="flex justify-between"><span>Plan</span><span className="font-medium">{plan.name}</span></div><div className="flex justify-between"><span>Duration</span><span className="font-medium">{plan.label}</span></div><div className="flex justify-between"><span>Network</span><span className="font-medium">{selectedCrypto.network}</span></div></div>
              <div className="flex gap-2"><button onClick={() => setStep("crypto-pick")} className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-gray-50">← Back</button><button onClick={() => setStep("proof")} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90">I've sent payment →</button></div>
            </div>
          )}
          {step === "proof" && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Upload a screenshot of your transaction confirmation. We'll verify and activate your promotion within <strong>1 hour</strong>.</p>
              <label className={`block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${screenshotPreview ? "border-primary bg-secondary" : "border-border hover:border-primary"}`}>
                {screenshotPreview ? <img src={screenshotPreview} alt="proof" className="max-h-48 mx-auto rounded-lg object-contain" /> : <div className="flex flex-col items-center gap-2"><Upload size={24} className="text-muted-foreground" /><p className="text-sm text-muted-foreground">Tap to upload screenshot</p><p className="text-xs text-muted-foreground">JPG, PNG supported</p></div>}
                <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" />
              </label>
              {screenshotPreview && <button onClick={() => { setScreenshot(null); setScreenshotPreview(null); }} className="text-xs text-muted-foreground underline">Remove and re-upload</button>}
              <div className="flex gap-2"><button onClick={() => setStep("crypto-address")} className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-gray-50">← Back</button><button onClick={handleCryptoSubmit} disabled={!screenshot || loading} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50">{loading ? "Submitting…" : "Submit Payment"}</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ property, onClose }: any) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = property.images?.length ? property.images : ["/placeholder.svg"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-border px-5 py-4 flex items-center justify-between z-10"><span className="font-semibold text-sm text-foreground">Listing Preview</span><button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
        <div className="relative h-56 bg-naija-surface overflow-hidden">
          <img src={images[imgIdx]} alt="" className="w-full h-full object-cover" />
          {images.length > 1 && <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">{images.map((_:any, i:number) => (<button key={i} onClick={() => setImgIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === imgIdx ? "bg-white scale-125" : "bg-white/50"}`} />))}</div>}
          {property.verified && <span className="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full">✓ Verified</span>}
          {property.promoted && <span className="absolute top-3 left-16 bg-naija-blue text-white text-[10px] font-bold px-2.5 py-1 rounded-full">🔥 Promoted</span>}
          <span className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{property.listing_type}</span>
        </div>
        <div className="p-5 space-y-4">
          <div><h2 className="font-display text-xl font-semibold text-foreground">{property.title}</h2><p className="text-sm text-muted-foreground mt-0.5">📍 {property.address || `${property.city}, ${property.state}`}</p></div>
          <div className="flex items-baseline gap-1"><span className="font-display text-2xl font-bold text-primary">{formatFullPrice(property.price)}</span>{property.price_label && <span className="text-sm text-muted-foreground">{property.price_label}</span>}</div>
          <div className="flex gap-6 text-sm text-muted-foreground">{!!property.beds && <span>🛏 {property.beds} bed{property.beds !== 1 ? "s" : ""}</span>}{!!property.baths && <span>🚿 {property.baths} bath{property.baths !== 1 ? "s" : ""}</span>}{property.size && <span>📐 {property.size}</span>}</div>
          {property.description && <p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p>}
          {property.amenities?.length > 0 && <div><p className="text-xs font-semibold text-foreground mb-2">Amenities</p><div className="flex flex-wrap gap-2">{property.amenities.map((a:string) => (<span key={a} className="text-xs bg-naija-surface border border-border px-2.5 py-1 rounded-full">{a}</span>))}</div></div>}
          {property.agent_name && <div className="bg-naija-surface rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">{property.agent_name[0]}</div><div><p className="text-sm font-semibold text-foreground">{property.agent_name}</p><p className="text-xs text-muted-foreground">{property.agent_title}</p></div>{property.agent_phone && <a href={`tel:${property.agent_phone}`} className="ml-auto text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-full hover:opacity-90">Call</a>}</div>}
        </div>
      </div>
    </div>
  );
}

function PayoutModal({ balance, onClose, onSuccess }: any) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [details, setDetails] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const maxAmt = balance?.available_balance || 0;

  const submit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { toast.error("Enter a valid amount"); return; }
    if (num > maxAmt) { toast.error("Amount exceeds available balance"); return; }
    if (num < 1000) { toast.error("Minimum payout is ₦1,000"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("payout_requests").insert({ landlord_id: balance.user_id, amount: num, method, account_details: details, status: "pending" });
    setSubmitting(false);
    if (error) { toast.error("Request failed: " + error.message); return; }
    toast.success("Payout request submitted. Admin will review shortly.");
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5"><h3 className="font-semibold text-lg flex items-center gap-2"><ArrowDownToLine size={18} className="text-primary" /> Request Payout</h3><button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
        <div className="space-y-4">
          <div className="rounded-xl bg-secondary/50 p-4"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Available Balance</div><div className="text-2xl font-bold text-primary mt-1">{formatFullPrice(maxAmt)}</div></div>
          <div><label className="text-xs font-bold uppercase text-muted-foreground">Amount (₦)</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className="mt-1 w-full h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary" /></div>
          <div><label className="text-xs font-bold uppercase text-muted-foreground">Payout Method</label><select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary"><option value="bank_transfer">Bank Transfer</option><option value="crypto_btc">Bitcoin (BTC)</option><option value="crypto_usdt">USDT (TRC20)</option></select></div>
          {method === "bank_transfer" && (
            <div className="space-y-3">
              <input placeholder="Bank Name" onChange={(e) => setDetails({...details, bank_name: e.target.value})} className="w-full h-11 rounded-xl border border-border px-4 text-sm" />
              <input placeholder="Account Number" onChange={(e) => setDetails({...details, account_number: e.target.value})} className="w-full h-11 rounded-xl border border-border px-4 text-sm" />
              <input placeholder="Account Name" onChange={(e) => setDetails({...details, account_name: e.target.value})} className="w-full h-11 rounded-xl border border-border px-4 text-sm" />
            </div>
          )}
          {method.startsWith("crypto") && (
            <div>
              <input placeholder={`${method === "crypto_btc" ? "BTC" : "USDT TRC20"} Wallet Address`} onChange={(e) => setDetails({...details, wallet_address: e.target.value, network: method === "crypto_usdt" ? "TRC20" : "Bitcoin"})} className="w-full h-11 rounded-xl border border-border px-4 text-sm" />
              {method === "crypto_usdt" && <p className="text-[11px] text-red-600 mt-1 font-medium">⚠️ Only TRC20 network. Wrong network = permanent loss.</p>}
            </div>
          )}
          <button onClick={submit} disabled={submitting} className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">{submitting && <Loader2 size={16} className="animate-spin" />} Submit Request</button>
        </div>
      </div>
    </div>
  );
}
const getListingStatusPills = ({ property, offers, bookings, escrowPayments }: any) => {
  const pills: Array<{ label: string; className: string }> = [];
  if (property.status === "booked" || bookings.some((b: any) => b.status === "confirmed")) {
    pills.push({ label: "Booked", className: "bg-blue-100 text-blue-700" });
  } else if (bookings.some((b: any) => b.status === "pending")) {
    pills.push({ label: "Reserved", className: "bg-amber-100 text-amber-700" });
  } else {
    pills.push({ label: "Available", className: "bg-emerald-100 text-emerald-700" });
  }
  if (offers.some((o: any) => o.status === "pending")) pills.push({ label: "Offer Pending", className: "bg-orange-100 text-orange-700" });
  if (escrowPayments.some((p: any) => p.status === "pending" || p.status === "confirmed")) pills.push({ label: "Escrow Held", className: "bg-violet-100 text-violet-700" });
  if (property.promoted) pills.push({ label: "Promoted", className: "bg-primary/10 text-primary" });
  return pills;
};

const getPropertyTimelineItems = ({ offers, bookings, escrowPayments, protectionCases }: any) => {
  const timeline = [
    ...offers.map((o: any) => ({ id: `offer-${o.id}`, createdAt: o.created_at, label: o.status === "accepted" ? "Offer accepted" : o.status === "rejected" ? "Offer declined" : "Offer pending", meta: `${formatFullPrice(o.offer_amount)}${o.phone ? ` • ${o.phone}` : ""}`, tone: o.status === "accepted" ? "bg-emerald-500" : o.status === "rejected" ? "bg-red-500" : "bg-orange-400" })),
    ...bookings.map((b: any) => ({ id: `booking-${b.id}`, createdAt: b.created_at, label: b.status === "confirmed" ? "Booking confirmed" : b.status === "declined" ? "Booking declined" : "Reservation request", meta: `${formatFullPrice(b.total_quote)} • ${b.booking_type}`, tone: b.status === "confirmed" ? "bg-blue-500" : b.status === "declined" ? "bg-red-500" : "bg-amber-400" })),
    ...escrowPayments.map((p: any) => ({ id: `escrow-${p.id}`, createdAt: p.created_at, label: p.status === "released" ? "Escrow released" : p.status === "refunded" ? "Escrow refunded" : p.status === "failed" || p.status === "cancelled" ? "Escrow failed" : "Escrow held", meta: `${formatFullPrice(p.amount_naira)}${p.payment_method ? ` • ${p.payment_method}` : ""}`, tone: p.status === "released" ? "bg-emerald-500" : p.status === "refunded" || p.status === "failed" || p.status === "cancelled" ? "bg-red-500" : "bg-violet-500" })),
    ...protectionCases.map((c: any) => ({ id: `case-${c.id}`, createdAt: c.created_at, label: c.status === "resolved" ? "Protection case resolved" : c.status === "dismissed" ? "Protection case dismissed" : "Protection case opened", meta: `${c.category} • ${c.priority} priority`, tone: c.status === "resolved" ? "bg-emerald-500" : c.status === "dismissed" ? "bg-slate-400" : "bg-rose-500" })),
  ];
  return timeline.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);
};

export default function LandlordDashboard({ onBack }: { onBack: () => void }) {
  const { user, profile } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequestRecord[]>([]);
  const [protectionCases, setProtectionCases] = useState<ProtectionCaseRecord[]>([]);
  const [engagementEvents, setEngagementEvents] = useState<EngagementEventRecord[]>([]);
  const [escrowPayments, setEscrowPayments] = useState<EscrowPaymentRecord[]>([]);
  const [landlordReviews, setLandlordReviews] = useState<LandlordReviewRecord[]>([]);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [balanceTxs, setBalanceTxs] = useState<BalanceTransaction[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [showPromotionAd, setShowPromotionAd] = useState(true);
  const [showListForm, setShowListForm] = useState(false);
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null);
  const [promoteProperty, setPromoteProperty] = useState<Property | null>(null);
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  const fetchMyProperties = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from("properties").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load your listings"); setLoading(false); return; }

    const propertyRows = (data as Property[]) || [];
    setProperties(propertyRows);
    const propertyIds = propertyRows.map((p) => p.id);
    if (propertyIds.length === 0) {
      setOffers([]); setBookingRequests([]); setProtectionCases([]); setEngagementEvents([]); setEscrowPayments([]); setLandlordReviews([]); setBalance(null); setBalanceTxs([]); setPayoutHistory([]);
      setLoading(false); return;
    }

    const [
      { data: offerData }, { data: bookingData }, { data: protectionData }, { data: engagementData },
      { data: escrowData }, { data: reviewData }, { data: balData }, { data: txData }, { data: payoutData }
    ] = await Promise.all([
      supabase.from("property_offers").select("*").eq("landlord_id", user.id).order("created_at", { ascending: false }),
      supabase.from("booking_requests").select("*").eq("landlord_id", user.id).order("created_at", { ascending: false }),
      supabase.from("protection_cases").select("*").eq("landlord_id", user.id).order("created_at", { ascending: false }),
      supabase.from("property_engagement_events").select("*").in("property_id", propertyIds),
      supabase.from("escrow_payments").select("*").eq("landlord_id", user.id).order("created_at", { ascending: false }),
      supabase.from("landlord_reviews").select("*").eq("landlord_id", user.id).eq("status", "published").order("created_at", { ascending: false }),
      supabase.from("landlord_balances").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("landlord_balance_transactions").select("*, properties(title)").eq("landlord_id", user.id).order("created_at", { ascending: false }),
      supabase.from("payout_requests").select("*").eq("landlord_id", user.id).order("created_at", { ascending: false }),
    ]);

    setOffers((offerData as OfferRecord[]) || []);
    setBookingRequests((bookingData as BookingRequestRecord[]) || []);
    setProtectionCases((protectionData as ProtectionCaseRecord[]) || []);
    setEngagementEvents((engagementData as EngagementEventRecord[]) || []);
    setEscrowPayments((escrowData as EscrowPaymentRecord[]) || []);
    setLandlordReviews((reviewData as LandlordReviewRecord[]) || []);
    setBalance(balData || { user_id: user.id, available_balance: 0, pending_balance: 0, total_earned: 0, total_withdrawn: 0 });
    setBalanceTxs((txData as BalanceTransaction[]) || []);
    setPayoutHistory((payoutData as PayoutRequest[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMyProperties(); }, [fetchMyProperties]);
  useEffect(() => { if (!user) return; const i = setInterval(() => fetchMyProperties(), 15000); return () => clearInterval(i); }, [fetchMyProperties, user]);

  const handleDelete = async (id: string) => { if (!confirm("Delete this property?")) return; const { error } = await supabase.from("properties").delete().eq("id", id); if (error) toast.error("Failed to delete"); else { toast.success("Property deleted"); fetchMyProperties(); } };
  const handleStatusToggle = async (p: Property) => { const next = p.status === "available" ? "booked" : "available"; const { error } = await supabase.from("properties").update({ status: next }).eq("id", p.id); if (error) toast.error("Failed to update status"); else { toast.success(next === "booked" ? "Marked as booked" : "Marked as available"); fetchMyProperties(); } };
  const handleEndPromotion = async (p: Property) => {
    if (!window.confirm(`End promotion for "${p.title}"?`)) return;
    const { error } = await supabase.from("properties").update({ promoted: false, promoted_until: null, promotion_plan: null }).eq("id", p.id);
    if (error) toast.error("Failed to end promotion");
    else { toast.success("Promotion ended"); await fetchMyProperties(); }
  };

  const handleOfferDecision = async (offer: OfferRecord, status: OfferRecord["status"]) => {
    const property = properties.find((entry) => entry.id === offer.property_id);
    setActionLoadingKey(`offer-${offer.id}-${status}`);
    try {
      const { error } = await supabase.rpc("resolve_property_offer", {
        p_offer_id: offer.id,
        p_status: status,
      });
      if (error) throw error;

      const propertyTitle = property?.title || "a property";
      const accepted = status === "accepted";
      await notifyUser(
        offer.buyer_id,
        accepted ? "Offer accepted" : "Offer declined",
        `Your offer of ${formatFullPrice(offer.offer_amount)} for ${propertyTitle} was ${accepted ? "accepted" : "declined"}.`,
        "offer",
        "view_property",
        { property_id: offer.property_id, offer_id: offer.id },
      );

      if (accepted) {
        await sendEmail(
          offer.buyer_id,
          "Your offer was accepted",
          `<h2>Offer accepted</h2><p>Your offer of ${formatFullPrice(offer.offer_amount)} for <strong>${propertyTitle}</strong> was accepted. Log in to NaijaStays to continue.</p>`,
        );
      }

      toast.success(accepted ? "Offer accepted. Buyer notified." : "Offer declined. Buyer notified.");
      await fetchMyProperties();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update offer");
    } finally {
      setActionLoadingKey(null);
    }
  };

 const handleBookingDecision = async (id: string, status: BookingRequestRecord["status"]) => {
  setActionLoadingKey(`booking-${id}-${status}`);
  
  // Fetch booking + property title for the notification
  const { data: bookingData } = await supabase
    .from("booking_requests")
    .select("*, properties(title)")
    .eq("id", id)
    .single();
    
  const bookingUpdate = status === "confirmed"
    ? await supabase.rpc("confirm_booking", { p_booking_id: id })
    : await supabase.from("booking_requests").update({ status }).eq("id", id);
  const { data: confirmedBooking, error } = bookingUpdate;
    
  setActionLoadingKey(null);
  
  if (error) { 
    toast.error("Failed to update booking"); 
    return; 
  }
  
  if (status === "confirmed" && bookingData) {
    toast.success("Booking confirmed. Earnings pending admin review.");
    
    // Notify guest
    await notifyUser(
      bookingData.guest_id,
      "Booking Confirmed ✅",
      `Booking ${confirmedBooking?.booking_reference || bookingData.booking_reference} for ${bookingData.properties?.title || "a property"} from ${formatShortDate(bookingData.check_in_date)} is confirmed. Contact the property with this reference.`,
      "booking",
      "view_property",
      { property_id: bookingData.property_id, booking_id: bookingData.id, booking_reference: confirmedBooking?.booking_reference || bookingData.booking_reference }
    );
    
    // Email guest
    await sendEmail(
      bookingData.guest_id,
      "Your Booking is Confirmed",
      `<h2>Booking Confirmed</h2><p>Your reference is <strong>${confirmedBooking?.booking_reference || bookingData.booking_reference}</strong>. Your stay at <strong>${bookingData.properties?.title || "a property"}</strong> is confirmed. Check-in: ${formatShortDate(bookingData.check_in_date)}. Please quote this reference when contacting the property.</p>`
    );
  } else {
    toast.success("Booking declined");
  }
  
  fetchMyProperties();
};

  const propertyLookup = new Map(properties.map((p) => [p.id, p]));
  const engagementStats = new Map<string, { clicks: number; views: number }>();
  for (const event of engagementEvents) {
    const cur = engagementStats.get(event.property_id) || { clicks: 0, views: 0 };
    if (event.event_type === "listing_click") cur.clicks += 1;
    if (event.event_type === "detail_view") cur.views += 1;
    engagementStats.set(event.property_id, cur);
  }

  const lowTrafficProperties = properties.filter((p) => { const s = engagementStats.get(p.id) || { clicks: 0, views: 0 }; const age = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)); return !p.promoted && age >= 3 && s.views < 8; });
  const totalViews = Array.from(engagementStats.values()).reduce((sum, c) => sum + c.views, 0);
  const totalClicks = Array.from(engagementStats.values()).reduce((sum, c) => sum + c.clicks, 0);
  const averageRating = landlordReviews.length ? landlordReviews.reduce((sum, r) => sum + r.rating, 0) / landlordReviews.length : 0;
  const pendingEscrowCount = escrowPayments.filter((p) => p.status === "pending" || p.status === "confirmed").length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 md:px-8 py-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4"><ArrowLeft size={16} /> Back to marketplace</button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground">Landlord Dashboard</h1><p className="text-sm text-muted-foreground mt-1">Manage your property listings</p></div>
          <button onClick={() => setShowListForm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold text-sm hover:opacity-90 transition-opacity w-fit"><Plus size={16} /> List New Property</button>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-10 gap-4">
          {[
            { label: "Total Listings", value: properties.length },
            { label: "Total Views", value: totalViews },
            { label: "Total Clicks", value: totalClicks },
            { label: "Pending Offers", value: offers.filter((o) => o.status === "pending").length },
            { label: "Booking Requests", value: bookingRequests.filter((b) => b.status === "pending").length },
            { label: "Open Cases", value: protectionCases.filter((c) => c.status === "open" || c.status === "investigating").length },
            { label: "Escrow Deals", value: pendingEscrowCount },
            { label: "Promoted", value: properties.filter((p) => p.promoted).length },
            { label: "Avg Rating", value: averageRating ? averageRating.toFixed(1) : "New" },
            { label: "Available", value: formatFullPrice(balance?.available_balance || 0) },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5">
              <div className="text-sm text-muted-foreground mb-1">{s.label}</div>
              <div className="font-display text-2xl font-semibold text-foreground">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Balance & Payout Banner */}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(22,163,74,0.12),rgba(255,255,255,1))] p-5 shadow-[0_18px_42px_-32px_rgba(21,128,61,0.7)]">
            <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-primary font-bold text-sm"><Wallet size={16} /> Available Balance</div><button onClick={() => { void fetchMyProperties(); toast.success("Wallet refreshed"); }} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline" title="Refresh wallet"><History size={13} /> Refresh wallet</button></div>
            <div className="mt-2 font-display text-3xl font-semibold text-foreground">{formatFullPrice(balance?.available_balance || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Withdraw anytime. Min ₦1,000.</p>
            <button onClick={() => setShowPayoutModal(true)} disabled={(balance?.available_balance || 0) < 1000} className="mt-4 w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40">Request Payout</button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm"><History size={16} /> Pending Earnings</div>
            <div className="mt-2 font-display text-3xl font-semibold text-foreground">{formatFullPrice(balance?.pending_balance || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">From confirmed bookings awaiting admin approval.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm"><Banknote size={16} /> Total Earned</div>
            <div className="mt-2 font-display text-3xl font-semibold text-foreground">{formatFullPrice(balance?.total_earned || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings on NaijaStays.</p>
          </div>
        </div>

        {showPromotionAd && lowTrafficProperties.length > 0 && (
          <div className="mt-4 rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(22,163,74,0.12),rgba(255,255,255,1))] p-5 shadow-[0_18px_42px_-32px_rgba(21,128,61,0.7)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="text-sm font-bold text-primary">Not getting enough views?</p><p className="mt-1 text-sm text-muted-foreground">{lowTrafficProperties.length} of your listings are underperforming. Promote them to reach more buyers and renters.</p></div>
              <div className="flex gap-2"><button onClick={() => setPromoteProperty(lowTrafficProperties[0])} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Promote now</button><button onClick={() => setShowPromotionAd(false)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">Dismiss</button></div>
            </div>
          </div>
        )}

        <div className="mt-4 bg-gradient-to-r from-primary to-naija-blue rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_20px_50px_-34px_rgba(21,128,61,0.85)]">
          <div><p className="text-white font-bold text-sm">🚀 Boost your listings</p><p className="text-white/85 text-xs mt-0.5">Pay with Naira, USDT, SOL or BTC. Get to the top of search results instantly.</p></div>
          <button onClick={() => properties.length > 0 && setPromoteProperty(properties[0])} className="shrink-0 bg-white text-primary font-bold text-sm px-4 py-2 rounded-full hover:bg-secondary transition-colors">Promote a listing →</button>
        </div>
      </div>

      {/* Properties List */}
      <div className="px-4 md:px-8 pb-12">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold text-foreground">Your Properties</h2><span className="text-xs text-muted-foreground">{properties.length} listing{properties.length !== 1 ? "s" : ""}</span></div>
          {loading ? <div className="p-12 text-center text-muted-foreground text-sm">Loading your properties…</div> : properties.length === 0 ? (
            <div className="p-12 text-center"><div className="text-4xl mb-4">🏠</div><h3 className="font-display text-xl font-medium mb-2">No properties listed yet</h3><p className="text-sm text-muted-foreground mb-5">Start listing your Port Harcourt properties to reach thousands of buyers and tenants.</p><button onClick={() => setShowListForm(true)} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold text-sm hover:opacity-90 transition-opacity">List Your First Property</button></div>
          ) : (
            <div className="divide-y divide-border">
              {properties.map((p) => {
                const pOffers = offers.filter((o) => o.property_id === p.id);
                const pBookings = bookingRequests.filter((b) => b.property_id === p.id);
                const pEscrows = escrowPayments.filter((e) => e.property_id === p.id);
                const pCases = protectionCases.filter((c) => c.property_id === p.id);
                const pills = getListingStatusPills({ property: p, offers: pOffers, bookings: pBookings, escrowPayments: pEscrows });
                const timeline = getPropertyTimelineItems({ offers: pOffers, bookings: pBookings, escrowPayments: pEscrows, protectionCases: pCases });
                return (
                  <div key={p.id} className="px-5 py-5 hover:bg-naija-surface/50 transition-colors">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                      <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-naija-surface shrink-0">
                        <img src={p.images?.[0] || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                        {p.promoted && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><span className="text-[8px] font-bold text-primary bg-white px-1 rounded">🔥 HOT</span></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-foreground truncate">{p.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">📍 {p.city}, {p.state} · {p.listing_type}</p>
                            <p className="text-sm font-display font-semibold text-foreground mt-1">{formatFullPrice(p.price)}{p.price_label && <span className="font-body text-xs text-muted-foreground ml-1">{p.price_label}</span>}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{engagementStats.get(p.id)?.views || 0} views • {engagementStats.get(p.id)?.clicks || 0} clicks</p>
                            {p.promoted && p.promoted_until && <p className="text-[10px] text-primary font-semibold mt-0.5">🔥 Promoted until {new Date(p.promoted_until).toLocaleDateString()}</p>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 lg:max-w-[280px] lg:justify-end">
                            {p.verified && <span className="inline-flex items-center gap-1 text-[10px] text-naija-green font-bold bg-naija-green-bg px-2 py-0.5 rounded-full">✓ Verified</span>}
                            {pills.map((pill: any) => <span key={`${p.id}-${pill.label}`} className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${pill.className}`}>{pill.label}</span>)}
                          </div>
                        </div>
                        <div className="mt-4 rounded-2xl border border-border bg-secondary/35 p-4">
                          <div className="flex items-center justify-between gap-3"><div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Listing timeline</div><div className="text-[11px] text-muted-foreground">{pOffers.length} offers • {pBookings.length} bookings • {pEscrows.length} escrow</div></div>
                          {timeline.length === 0 ? <div className="mt-3 text-sm text-muted-foreground">No activity on this listing yet.</div> : (
                            <div className="mt-3 space-y-3">{timeline.map((item: any) => (
                              <div key={item.id} className="flex items-start gap-3"><div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${item.tone}`} /><div className="min-w-0"><div className="text-sm font-semibold text-foreground">{item.label}</div><div className="text-xs text-muted-foreground">{item.meta} • {formatShortDate(item.createdAt)}</div></div></div>
                            ))}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 xl:pt-1">
                        <button onClick={() => handleStatusToggle(p)} className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${p.status === "booked" ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-100 text-green-600 hover:bg-green-200"}`} title="Toggle availability">{p.status === "booked" ? "🔴 Booked" : "🟢 Available"}</button>
                        <button onClick={() => setPreviewProperty(p)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Preview"><Eye size={16} /></button>
                        <button onClick={() => setEditProperty(p)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit listing"><Pencil size={16} /></button>
                        <button onClick={() => setPromoteProperty(p)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors" title="Promote"><Megaphone size={16} /></button>
                        {p.promoted && <button onClick={() => handleEndPromotion(p)} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50" title="End promotion"><X size={16} /></button>}
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Offers / Bookings / Cases / Escrow */}
      <div className="px-4 md:px-8 pb-12 grid gap-6 xl:grid-cols-4">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold text-foreground">Buyer Offers</h2><span className="text-xs text-muted-foreground">{offers.length} total</span></div>
          <div className="divide-y divide-border">
            {offers.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No offers yet.</div> : offers.slice(0, 6).map((offer) => { const property = propertyLookup.get(offer.property_id); return (
              <div key={offer.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-foreground">{property?.title || "Property offer"}</div><div className="text-xs text-muted-foreground">{formatShortDate(offer.created_at)}</div></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${offer.status === "accepted" ? "bg-green-100 text-green-700" : offer.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{offer.status}</span></div>
                <div className="text-lg font-semibold text-primary">{formatFullPrice(offer.offer_amount)}</div>
                <div className="text-sm text-muted-foreground">{offer.financing_type || "Financing plan not supplied"}{offer.phone ? ` • ${offer.phone}` : ""}</div>
                {offer.message && <p className="text-sm text-foreground">{offer.message}</p>}
                {offer.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleOfferDecision(offer, "accepted")} disabled={actionLoadingKey === `offer-${offer.id}-accepted`} className="flex-1 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{actionLoadingKey === `offer-${offer.id}-accepted` ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Accept</button>
                    <button onClick={() => handleOfferDecision(offer, "rejected")} disabled={actionLoadingKey === `offer-${offer.id}-rejected`} className="flex-1 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">{actionLoadingKey === `offer-${offer.id}-rejected` ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Decline</button>
                  </div>
                )}
              </div>
            ); })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold text-foreground">Booking Requests</h2><span className="text-xs text-muted-foreground">{bookingRequests.length} total</span></div>
          <div className="divide-y divide-border">
            {bookingRequests.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No booking requests yet.</div> : bookingRequests.slice(0, 6).map((booking) => { const property = propertyLookup.get(booking.property_id); return (
              <div key={booking.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-foreground">{property?.title || "Booking request"}</div><div className="text-xs text-muted-foreground">{formatShortDate(booking.check_in_date)}{booking.check_out_date ? ` → ${formatShortDate(booking.check_out_date)}` : ""}</div></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${booking.status === "confirmed" ? "bg-green-100 text-green-700" : booking.status === "declined" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{booking.status}</span></div>
                <div className="text-sm text-muted-foreground">{booking.booking_type}{booking.requested_term_months ? ` • ${booking.requested_term_months} months` : ""}{booking.guests_count ? ` • ${booking.guests_count} guest${booking.guests_count === 1 ? "" : "s"}` : ""}</div>
                {booking.booking_reference && <button onClick={() => copyBookingValue("Booking reference", booking.booking_reference)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"><Copy size={13} /> Booking reference: {booking.booking_reference}</button>}
                <div className="text-lg font-semibold text-primary">{formatFullPrice(booking.total_quote)}</div>
                {booking.phone && <div className="text-sm text-muted-foreground">{booking.phone}</div>}
                {booking.notes && <p className="text-sm text-foreground">{booking.notes}</p>}
                {booking.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleBookingDecision(booking.id, "confirmed")} disabled={actionLoadingKey === `booking-${booking.id}-confirmed`} className="flex-1 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{actionLoadingKey === `booking-${booking.id}-confirmed` ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Confirm</button>
                    <button onClick={() => handleBookingDecision(booking.id, "declined")} disabled={actionLoadingKey === `booking-${booking.id}-declined`} className="flex-1 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">{actionLoadingKey === `booking-${booking.id}-declined` ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Decline</button>
                  </div>
                )}
              </div>
            ); })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold text-foreground">Protection Cases</h2><span className="text-xs text-muted-foreground">{protectionCases.length} total</span></div>
          <div className="divide-y divide-border">
            {protectionCases.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No protection cases on your listings.</div> : protectionCases.slice(0, 6).map((entry) => { const property = propertyLookup.get(entry.property_id || ""); return (
              <div key={entry.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-foreground">{property?.title || "Listing support case"}</div><div className="text-xs text-muted-foreground">{entry.category} • {formatShortDate(entry.created_at)}</div></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${entry.status === "resolved" ? "bg-green-100 text-green-700" : entry.status === "dismissed" ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-700"}`}>{entry.status}</span></div>
                <div className="text-sm font-semibold text-foreground">{entry.summary}</div>
                {entry.details && <p className="text-sm text-muted-foreground">{entry.details}</p>}
                <div className="text-xs text-muted-foreground">Priority: {entry.priority} {entry.phone ? `• ${entry.phone}` : ""}</div>
              </div>
            ); })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold text-foreground">Escrow Payments</h2><span className="text-xs text-muted-foreground">{escrowPayments.length} total</span></div>
          <div className="divide-y divide-border">
            {escrowPayments.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No escrow payments yet.</div> : escrowPayments.slice(0, 6).map((payment) => { const property = propertyLookup.get(payment.property_id); return (
              <div key={payment.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-foreground">{property?.title || "Escrow payment"}</div><div className="text-xs text-muted-foreground">{formatShortDate(payment.created_at)}</div></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${payment.status === "released" ? "bg-green-100 text-green-700" : payment.status === "failed" || payment.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{payment.status}</span></div>
                <div className="text-lg font-semibold text-primary">{formatFullPrice(payment.amount_naira)}</div>
                <div className="text-sm text-muted-foreground">{payment.payment_channel} {payment.payment_method ? `• ${payment.payment_method}` : ""}</div>
                {payment.note && <p className="text-sm text-foreground">{payment.note}</p>}
              </div>
            ); })}
          </div>
        </div>
      </div>

      {/* Earnings & Payout History */}
      <div className="px-4 md:px-8 pb-12 grid gap-6 xl:grid-cols-2">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold text-foreground">Earnings History</h2><span className="text-xs text-muted-foreground">{balanceTxs.length} transactions</span></div>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {balanceTxs.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No earnings yet. Confirm bookings to generate credits.</div> : balanceTxs.map((tx) => (
              <div key={tx.id} className="p-5 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{tx.properties?.title || "Booking credit"}</div>
                  <div className="text-xs text-muted-foreground">{tx.type === 'booking_credit' ? 'Booking earnings' : 'Adjustment'} • {formatShortDate(tx.created_at)}</div>
                  {tx.admin_note && <p className="text-xs text-muted-foreground mt-1">Note: {tx.admin_note}</p>}
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary">+{formatFullPrice(tx.amount)}</div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${tx.status === 'approved' ? 'bg-green-100 text-green-700' : tx.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold text-foreground">Payout History</h2><span className="text-xs text-muted-foreground">{payoutHistory.length} requests</span></div>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {payoutHistory.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No payout requests yet.</div> : payoutHistory.map((payout) => (
              <div key={payout.id} className="p-5 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{formatFullPrice(payout.amount)}</div>
                  <div className="text-xs text-muted-foreground">{payout.method || "No method"} • {formatShortDate(payout.created_at)}</div>
                  {payout.admin_note && <p className="text-xs text-muted-foreground mt-1">Note: {payout.admin_note}</p>}
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${payout.status === 'paid' ? 'bg-green-100 text-green-700' : payout.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{payout.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reputation */}
      <div className="px-4 md:px-8 pb-12">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-semibold text-foreground">Reputation</h2><span className="text-xs text-muted-foreground">{landlordReviews.length} review{landlordReviews.length === 1 ? "" : "s"}</span></div>
          <div className="grid gap-4 p-5 md:grid-cols-[240px_1fr]">
            <div className="rounded-2xl border border-primary/10 bg-[linear-gradient(180deg,rgba(240,253,244,0.9),rgba(255,255,255,1))] p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-primary">Public score</div>
              <div className="mt-2 font-display text-4xl font-semibold text-foreground">{averageRating ? averageRating.toFixed(1) : "New"}</div>
              <div className="mt-2 text-sm text-muted-foreground">Based on feedback left by tenants and buyers on your landlord profile.</div>
            </div>
            <div className="space-y-3">
              {landlordReviews.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Reviews will appear here after users rate your landlord profile from the listing page.</div> : landlordReviews.slice(0, 5).map((review) => (
                <div key={review.id} className="rounded-2xl border border-border bg-secondary/35 p-4">
                  <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-foreground">{review.reviewer_name || "NaijaStays user"}</div><div className="text-xs text-muted-foreground">{formatShortDate(review.created_at)}</div></div><div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground">★ {review.rating.toFixed(1)}</div></div>
                  {review.review && <p className="mt-3 text-sm text-muted-foreground">{review.review}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showListForm && <ListPropertyForm onClose={() => setShowListForm(false)} onSuccess={fetchMyProperties} />}
      {editProperty && <ListPropertyForm property={editProperty} onClose={() => setEditProperty(null)} onSuccess={fetchMyProperties} />}
      {previewProperty && <PreviewModal property={previewProperty} onClose={() => setPreviewProperty(null)} />}
      {promoteProperty && <PromoteModal property={promoteProperty} userId={user!.id} userEmail={user?.email ?? ""} userName={profile?.full_name ?? ""} onClose={() => { setPromoteProperty(null); fetchMyProperties(); }} />}
      {showPayoutModal && balance && <PayoutModal balance={balance} onClose={() => setShowPayoutModal(false)} onSuccess={fetchMyProperties} />}
    </div>
  );
}