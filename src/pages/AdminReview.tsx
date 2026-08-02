import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  Home,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type AdminDashboardRow = Tables<"admin_dashboard">;
type PropertyRecord = Tables<"properties">;
type PromotionPaymentRecord = Tables<"promotion_payments">;
type OfferRecord = Tables<"property_offers">;
type BookingRequestRecord = Tables<"booking_requests">;
type ProtectionCaseRecord = Tables<"protection_cases">;
type EscrowPaymentRecord = Tables<"escrow_payments">;

interface PendingPayment {
  id: string;
  plan: string;
  amount_naira: number;
  payment_method: string | null;
  payment_reference: string | null;
  screenshot_url: string | null;
  created_at: string;
  property_id: string;
  property_title: string;
  property_city: string | null;
  property_state: string | null;
  owner_id: string;
  owner_name: string | null;
  owner_phone: string | null;
}

interface PendingApplication {
  id: string;
  user_id: string;
  role_requested: string;
  status: string;
  message: string | null;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  existing_roles: string[] | null;
}

interface DashboardUser {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  profile_created_at: string;
  roles: string[] | null;
}

interface ApplicationCounts {
  pending: number;
  approved: number;
  rejected: number;
}

type TabId = "overview" | "payments" | "escrow" | "applications" | "listings" | "offers" | "bookings" | "protection";
type ListingFilter = "all" | "promoted" | "unverified" | "occupied";

const ADMIN_TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "payments", label: "Payments" },
  { id: "escrow", label: "Escrow" },
  { id: "applications", label: "Applications" },
  { id: "listings", label: "Listings" },
  { id: "offers", label: "Offers" },
  { id: "bookings", label: "Bookings" },
  { id: "protection", label: "Protection" },
];

const LISTING_FILTERS: Array<{ id: ListingFilter; label: string }> = [
  { id: "all", label: "All listings" },
  { id: "promoted", label: "Promoted" },
  { id: "unverified", label: "Needs verification" },
  { id: "occupied", label: "Occupied" },
];

const PLAN_DURATIONS: Record<string, number> = {
  basic: 7,
  pro: 14,
  elite: 30,
};

const asArray = <T,>(value: AdminDashboardRow[keyof AdminDashboardRow] | null | undefined): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const formatNaira = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const getPropertyStatusTone = (status: string | null) => {
  if (status === "occupied") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "booked") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
};

export default function AdminReview() {
  const navigate = useNavigate();
  const { roles, loading: authLoading } = useAuth();
  const isAdmin = roles?.includes("admin") ?? false;

  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [listingQuery, setListingQuery] = useState("");
  const [listingFilter, setListingFilter] = useState<ListingFilter>("all");

  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [pendingApplications, setPendingApplications] = useState<PendingApplication[]>([]);
  const [allUsers, setAllUsers] = useState<DashboardUser[]>([]);
  const [applicationCounts, setApplicationCounts] = useState<ApplicationCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequestRecord[]>([]);
  const [protectionCases, setProtectionCases] = useState<ProtectionCaseRecord[]>([]);
  const [escrowPayments, setEscrowPayments] = useState<EscrowPaymentRecord[]>([]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      const [
        { data: dashboard, error: dashboardError },
        { data: paymentData, error: paymentError },
        { data: propertiesData, error: propertiesError },
        { data: offerData, error: offerError },
        { data: bookingData, error: bookingError },
        { data: protectionData, error: protectionError },
        { data: escrowData, error: escrowError },
      ] =
        await Promise.all([
          supabase.from("admin_dashboard").select("*").maybeSingle(),
          supabase.from("promotion_payments").select("*").eq("status", "pending").order("created_at", { ascending: false }),
          supabase.from("properties").select("*").order("created_at", { ascending: false }),
          supabase.from("property_offers").select("*").order("created_at", { ascending: false }),
          supabase.from("booking_requests").select("*").order("created_at", { ascending: false }),
          supabase.from("protection_cases").select("*").order("created_at", { ascending: false }),
          supabase.from("escrow_payments").select("*").order("created_at", { ascending: false }),
        ]);

      if (dashboardError) throw dashboardError;
      if (paymentError) throw paymentError;
      if (propertiesError) throw propertiesError;
      if (offerError) throw offerError;
      if (bookingError) throw bookingError;
      if (protectionError) throw protectionError;
      if (escrowError) throw escrowError;

      setPendingApplications(asArray<PendingApplication>(dashboard?.pending_applications));
      setAllUsers(asArray<DashboardUser>(dashboard?.all_users));

      const counts = dashboard?.application_status_counts as Partial<ApplicationCounts> | null;
      setApplicationCounts({
        pending: counts?.pending ?? 0,
        approved: counts?.approved ?? 0,
        rejected: counts?.rejected ?? 0,
      });

      setProperties((propertiesData as PropertyRecord[]) ?? []);
      setOffers((offerData as OfferRecord[]) ?? []);
      setBookingRequests((bookingData as BookingRequestRecord[]) ?? []);
      setProtectionCases((protectionData as ProtectionCaseRecord[]) ?? []);
      setEscrowPayments((escrowData as EscrowPaymentRecord[]) ?? []);

      const propertyMap = new Map(((propertiesData as PropertyRecord[]) ?? []).map((property) => [property.id, property]));
      const userMap = new Map(
        asArray<DashboardUser>(dashboard?.all_users).map((entry) => [entry.user_id, entry]),
      );

      const nextPendingPayments = ((paymentData as PromotionPaymentRecord[]) ?? []).map((payment) => {
        const property = propertyMap.get(payment.property_id);
        const owner = property ? userMap.get(property.user_id) : null;

        return {
          id: payment.id,
          plan: payment.plan,
          amount_naira: payment.amount_naira,
          payment_method: payment.payment_method,
          payment_reference: payment.payment_reference,
          screenshot_url: payment.screenshot_url,
          created_at: payment.created_at,
          property_id: payment.property_id,
          property_title: property?.title || "Unknown property",
          property_city: property?.city || null,
          property_state: property?.state || null,
          owner_id: property?.user_id || payment.user_id,
          owner_name: owner?.full_name || null,
          owner_phone: owner?.phone || null,
        } satisfies PendingPayment;
      });

      setPendingPayments(nextPendingPayments);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load the admin workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchAdminData();
    }
  }, [authLoading, isAdmin]);

  const runPropertyUpdate = async (
    propertyId: string,
    updates: Partial<PropertyRecord>,
    successMessage: string,
    actionId: string,
  ) => {
    try {
      setActionKey(actionId);
      const { error } = await supabase.from("properties").update(updates).eq("id", propertyId);
      if (error) throw error;
      toast.success(successMessage);
      await fetchAdminData();
    } catch (error) {
      console.error(error);
      toast.error("Property update failed");
    } finally {
      setActionKey(null);
    }
  };

  const approvePayment = async (payment: PendingPayment) => {
    try {
      setActionKey(`payment-approve-${payment.id}`);

      const until = new Date();
      until.setDate(until.getDate() + (PLAN_DURATIONS[payment.plan] || 7));

      const { error: propertyError } = await supabase
        .from("properties")
        .update({
          promoted: true,
          promoted_until: until.toISOString(),
          promotion_plan: payment.plan,
        })
        .eq("id", payment.property_id);

      if (propertyError) throw propertyError;

      const { error: paymentError } = await supabase
        .from("promotion_payments")
        .update({ status: "confirmed" })
        .eq("id", payment.id);

      if (paymentError) throw paymentError;

      toast.success("Promotion payment approved");
      await fetchAdminData();
    } catch (error) {
      console.error(error);
      toast.error("Approval failed");
    } finally {
      setActionKey(null);
    }
  };

  const rejectPayment = async (payment: PendingPayment) => {
    try {
      setActionKey(`payment-reject-${payment.id}`);
      const { error } = await supabase
        .from("promotion_payments")
        .update({ status: "failed" })
        .eq("id", payment.id);
      if (error) throw error;
      toast.success("Payment rejected");
      await fetchAdminData();
    } catch (error) {
      console.error(error);
      toast.error("Rejection failed");
    } finally {
      setActionKey(null);
    }
  };

  const deletePayment = async (payment: PendingPayment) => {
    if (!window.confirm(`Delete the pending payment for "${payment.property_title}"?`)) return;

    try {
      setActionKey(`payment-delete-${payment.id}`);
      const { error } = await supabase
        .from("promotion_payments")
        .delete()
        .eq("id", payment.id);
      if (error) throw error;
      toast.success("Payment deleted");
      await fetchAdminData();
    } catch (error) {
      console.error(error);
      toast.error("Delete failed");
    } finally {
      setActionKey(null);
    }
  };

  const updateEscrowPayment = async (
    payment: EscrowPaymentRecord,
    status: EscrowPaymentRecord["status"],
    successMessage: string,
  ) => {
    try {
      setActionKey(`escrow-${payment.id}-${status}`);
      const { error } = await supabase
        .from("escrow_payments")
        .update({ status })
        .eq("id", payment.id);
      if (error) throw error;
      toast.success(successMessage);
      await fetchAdminData();
    } catch (error) {
      console.error(error);
      toast.error("Escrow update failed");
    } finally {
      setActionKey(null);
    }
  };

  const approveApplication = async (application: PendingApplication) => {
    try {
      setActionKey(`application-approve-${application.id}`);

      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: application.user_id, role: "landlord" }, { onConflict: "user_id,role" });

      if (roleError) throw roleError;

      const { error: applicationError } = await supabase
        .from("landlord_applications")
        .update({ status: "approved" })
        .eq("id", application.id);

      if (applicationError) throw applicationError;

      toast.success("Landlord access approved");
      await fetchAdminData();
    } catch (error) {
      console.error(error);
      toast.error("Application approval failed");
    } finally {
      setActionKey(null);
    }
  };

  const rejectApplication = async (application: PendingApplication) => {
    try {
      setActionKey(`application-reject-${application.id}`);
      const { error } = await supabase
        .from("landlord_applications")
        .update({ status: "rejected" })
        .eq("id", application.id);
      if (error) throw error;
      toast.success("Application rejected");
      await fetchAdminData();
    } catch (error) {
      console.error(error);
      toast.error("Application rejection failed");
    } finally {
      setActionKey(null);
    }
  };

  const deleteProperty = async (property: PropertyRecord) => {
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return;

    try {
      setActionKey(`property-delete-${property.id}`);
      const { error } = await supabase.from("properties").delete().eq("id", property.id);
      if (error) throw error;
      toast.success("Property deleted");
      await fetchAdminData();
    } catch (error) {
      console.error(error);
      toast.error("Delete failed");
    } finally {
      setActionKey(null);
    }
  };

  const filteredProperties = useMemo(() => {
    const query = listingQuery.trim().toLowerCase();

    return properties.filter((property) => {
      if (listingFilter === "promoted" && !property.promoted) return false;
      if (listingFilter === "unverified" && property.verified) return false;
      if (listingFilter === "occupied" && property.status !== "occupied") return false;

      if (!query) return true;

      const haystack = [
        property.title,
        property.city,
        property.state,
        property.listing_type,
        property.property_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [listingFilter, listingQuery, properties]);

  const propertyLookup = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );

  const userLookup = useMemo(
    () => new Map(allUsers.map((entry) => [entry.user_id, entry])),
    [allUsers],
  );

  const promotedCount = properties.filter((property) => property.promoted).length;
  const verifiedCount = properties.filter((property) => property.verified).length;
  const occupiedCount = properties.filter((property) => property.status === "occupied").length;
  const pendingOfferCount = offers.filter((offer) => offer.status === "pending").length;
  const pendingBookingCount = bookingRequests.filter((booking) => booking.status === "pending").length;
  const pendingEscrowCount = escrowPayments.filter(
    (payment) => payment.status === "pending" || payment.status === "confirmed",
  ).length;
  const openProtectionCount = protectionCases.filter(
    (entry) => entry.status === "open" || entry.status === "investigating",
  ).length;

  const updateProtectionStatus = async (
    protectionCase: ProtectionCaseRecord,
    status: ProtectionCaseRecord["status"],
  ) => {
    try {
      setActionKey(`protection-${protectionCase.id}-${status}`);
      const { error } = await supabase
        .from("protection_cases")
        .update({ status })
        .eq("id", protectionCase.id);
      if (error) throw error;
      toast.success(`Protection case marked ${status}`);
      await fetchAdminData();
    } catch (error) {
      console.error(error);
      toast.error("Protection case update failed");
    } finally {
      setActionKey(null);
    }
  };

  if (authLoading || (loading && isAdmin)) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="animate-spin" size={18} />
          Loading admin workspace...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
          <ShieldCheck size={50} className="mx-auto mb-4 text-emerald-300" />
          <h1 className="text-2xl font-semibold mb-2">Admin access only</h1>
          <p className="text-sm text-white/70 mb-5">
            Your account does not currently have admin access for this workspace.
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900"
          >
            <ArrowLeft size={14} />
            Back to marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(22,163,74,0.12),transparent_24%),linear-gradient(180deg,#f7fcf7_0%,#ffffff_56%)]">
      <div className="px-4 py-6 md:px-8 md:py-8">
        <div className="rounded-[32px] border border-primary/10 bg-[#0f2618] p-6 text-white shadow-[0_34px_80px_-45px_rgba(21,128,61,0.75)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                onClick={() => navigate("/")}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-white/80"
              >
                <ArrowLeft size={14} />
                Back to site
              </button>
              <h1 className="font-display text-3xl md:text-4xl">NaijaStays Admin</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/75">
                Review landlord approvals, confirm promotion and escrow payments, and keep listings clean from one functional workspace.
              </p>
            </div>

            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#0f2618] transition hover:bg-emerald-50 disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh data
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: "Pending payments",
                value: pendingPayments.length,
                note: "Waiting for confirmation",
                icon: Sparkles,
              },
              {
                label: "Escrow queue",
                value: pendingEscrowCount,
                note: "Tenant funds needing attention",
                icon: ShieldCheck,
              },
              {
                label: "Pending applications",
                value: pendingApplications.length,
                note: `${applicationCounts.approved} approved so far`,
                icon: UserCheck,
              },
              {
                label: "Pending offers",
                value: pendingOfferCount,
                note: "Buyer negotiation queue",
                icon: Tag,
              },
              {
                label: "Booking requests",
                value: pendingBookingCount,
                note: "Awaiting landlord response",
                icon: Clock3,
              },
              {
                label: "Open protection",
                value: openProtectionCount,
                note: "Trust and dispute cases",
                icon: ShieldCheck,
              },
              {
                label: "Promoted listings",
                value: promotedCount,
                note: `${verifiedCount} verified • ${occupiedCount} occupied`,
                icon: Home,
              },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-3xl border border-white/10 bg-white/6 p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <Icon size={18} className="text-emerald-200" />
                  </div>
                  <div className="text-xs uppercase tracking-[0.24em] text-white/55">{metric.label}</div>
                  <div className="mt-2 font-display text-3xl">{metric.value}</div>
                  <div className="mt-1 text-sm text-white/65">{metric.note}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-[0_18px_36px_-24px_rgba(21,128,61,0.8)]"
                  : "bg-white text-muted-foreground border border-border hover:border-primary/25 hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="rounded-[28px] border border-border bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Priority queue</h2>
                  <p className="text-sm text-muted-foreground">The next things your team should review.</p>
                </div>
                <Clock3 className="text-primary" size={20} />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-border bg-secondary/45 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-primary">Promotion payments</div>
                  <div className="mt-2 font-display text-3xl">{pendingPayments.length}</div>
                  <div className="mt-4 space-y-3">
                    {pendingPayments.slice(0, 3).map((payment) => (
                      <div key={payment.id} className="rounded-2xl bg-white p-3">
                        <div className="text-sm font-semibold text-foreground">{payment.property_title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatNaira(payment.amount_naira)} • {payment.plan.toUpperCase()}
                        </div>
                      </div>
                    ))}
                    {pendingPayments.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                        No pending promotion payments right now.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-secondary/45 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-primary">Landlord applications</div>
                  <div className="mt-2 font-display text-3xl">{pendingApplications.length}</div>
                  <div className="mt-4 space-y-3">
                    {pendingApplications.slice(0, 3).map((application) => (
                      <div key={application.id} className="rounded-2xl bg-white p-3">
                        <div className="text-sm font-semibold text-foreground">
                          {application.full_name || "Unnamed applicant"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {application.phone || "No phone supplied"}
                        </div>
                      </div>
                    ))}
                    {pendingApplications.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                        No pending landlord approvals right now.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-secondary/45 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-primary">Escrow payments</div>
                  <div className="mt-2 font-display text-3xl">{pendingEscrowCount}</div>
                  <div className="mt-4 space-y-3">
                    {escrowPayments.slice(0, 3).map((payment) => {
                      const property = propertyLookup.get(payment.property_id);
                      return (
                        <div key={payment.id} className="rounded-2xl bg-white p-3">
                          <div className="text-sm font-semibold text-foreground">{property?.title || "Escrow payment"}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatNaira(payment.amount_naira)} • {payment.status}
                          </div>
                        </div>
                      );
                    })}
                    {escrowPayments.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                        No escrow payments in the queue right now.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-border bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Platform snapshot</h2>
                  <p className="text-sm text-muted-foreground">A quick picture of moderation and growth.</p>
                </div>
                <Building2 className="text-primary" size={20} />
              </div>

              <div className="mt-5 space-y-3">
                {[
                  { label: "All profiles", value: allUsers.length },
                  { label: "Listings needing verification", value: properties.filter((item) => !item.verified).length },
                  { label: "Available listings", value: properties.filter((item) => item.status === "available").length },
                  { label: "Escrow deals in progress", value: pendingEscrowCount },
                  { label: "Approved landlord applications", value: applicationCounts.approved },
                  { label: "Rejected landlord applications", value: applicationCounts.rejected },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border p-4">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-lg font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="mt-6 space-y-4">
            {pendingPayments.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
                No pending promotion payments to review.
              </div>
            )}

            {pendingPayments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-[28px] border border-border bg-white p-6 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                        {payment.plan}
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Pending review
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{payment.property_title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {payment.property_city || "Unknown city"}
                        {payment.property_state ? `, ${payment.property_state}` : ""}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl bg-secondary/50 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Amount</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">{formatNaira(payment.amount_naira)}</div>
                      </div>
                      <div className="rounded-2xl bg-secondary/50 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Submitted</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">{formatDate(payment.created_at)}</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Owner: <span className="font-medium text-foreground">{payment.owner_name || "Unknown owner"}</span>
                    </div>
                  </div>

                  <div className="w-full max-w-sm rounded-3xl border border-border bg-slate-50 p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Actions</div>
                    <div className="mt-4 space-y-3">
                      {payment.screenshot_url && (
                        <a
                          href={payment.screenshot_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                        >
                          <Eye size={15} />
                          View payment proof
                        </a>
                      )}
                      <button
                        onClick={() => approvePayment(payment)}
                        disabled={actionKey === `payment-approve-${payment.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {actionKey === `payment-approve-${payment.id}` ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Approve payment
                      </button>
                      <button
                        onClick={() => rejectPayment(payment)}
                        disabled={actionKey === `payment-reject-${payment.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        {actionKey === `payment-reject-${payment.id}` ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                        Reject payment
                      </button>
                      <button
                        onClick={() => deletePayment(payment)}
                        disabled={actionKey === `payment-delete-${payment.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                      >
                        {actionKey === `payment-delete-${payment.id}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Delete payment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "escrow" && (
          <div className="mt-6 space-y-4">
            {escrowPayments.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
                No escrow payments have been created yet.
              </div>
            )}

            {escrowPayments.map((payment) => {
              const property = propertyLookup.get(payment.property_id);
              const tenant = userLookup.get(payment.tenant_id);
              const landlord = userLookup.get(payment.landlord_id);

              return (
                <div
                  key={payment.id}
                  className="rounded-[28px] border border-border bg-white p-6 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                          Escrow
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          payment.status === "released"
                            ? "bg-emerald-50 text-emerald-700"
                            : payment.status === "failed" || payment.status === "cancelled" || payment.status === "refunded"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}>
                          {payment.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-foreground">
                          {property?.title || "Unknown property"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Tenant: {tenant?.full_name || "Unknown tenant"} • Landlord: {landlord?.full_name || "Unknown landlord"}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Amount</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">{formatNaira(payment.amount_naira)}</div>
                        </div>
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Channel</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">
                            {payment.payment_channel}{payment.payment_method ? ` • ${payment.payment_method}` : ""}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Submitted</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{formatDate(payment.created_at)}</div>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {payment.payer_phone || "No payer phone supplied"}
                        {payment.payment_reference ? ` • Ref: ${payment.payment_reference}` : ""}
                      </div>
                      {payment.note && <p className="text-sm text-foreground">{payment.note}</p>}
                    </div>

                    <div className="w-full max-w-sm rounded-3xl border border-border bg-slate-50 p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Escrow actions</div>
                      <div className="mt-4 grid gap-3">
                        {payment.screenshot_url && (
                          <a
                            href={payment.screenshot_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                          >
                            <Eye size={15} />
                            View payment proof
                          </a>
                        )}

                        {payment.status === "pending" && (
                          <button
                            onClick={() => updateEscrowPayment(payment, "confirmed", "Escrow payment confirmed")}
                            disabled={actionKey === `escrow-${payment.id}-confirmed`}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                          >
                            {actionKey === `escrow-${payment.id}-confirmed` ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Confirm receipt
                          </button>
                        )}

                        {(payment.status === "pending" || payment.status === "confirmed") && (
                          <button
                            onClick={() => updateEscrowPayment(payment, "released", "Escrow payment released")}
                            disabled={actionKey === `escrow-${payment.id}-released`}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-secondary px-4 py-3 text-sm font-semibold text-primary hover:bg-secondary/80 disabled:opacity-60"
                          >
                            {actionKey === `escrow-${payment.id}-released` ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                            Mark released
                          </button>
                        )}

                        {(payment.status === "pending" || payment.status === "confirmed") && (
                          <button
                            onClick={() => updateEscrowPayment(payment, "refunded", "Escrow payment refunded")}
                            disabled={actionKey === `escrow-${payment.id}-refunded`}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            {actionKey === `escrow-${payment.id}-refunded` ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                            Mark refunded
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "applications" && (
          <div className="mt-6 space-y-4">
            {pendingApplications.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
                No pending landlord applications to review.
              </div>
            )}

            {pendingApplications.map((application) => (
              <div
                key={application.id}
                className="rounded-[28px] border border-border bg-white p-6 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                        {application.role_requested}
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Awaiting decision
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-semibold text-foreground">
                      {application.full_name || "Unnamed applicant"}
                    </h3>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {application.phone || "No phone supplied"} • Submitted {formatDate(application.created_at)}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-secondary/50 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current roles</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(application.existing_roles ?? []).length > 0 ? (
                            (application.existing_roles ?? []).map((role) => (
                              <span key={role} className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground">
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No roles yet</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-secondary/50 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Applicant note</div>
                        <div className="mt-2 text-sm text-foreground">
                          {application.message?.trim() || "No message supplied with this request."}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-sm rounded-3xl border border-border bg-slate-50 p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Decision</div>
                    <div className="mt-4 space-y-3">
                      <button
                        onClick={() => approveApplication(application)}
                        disabled={actionKey === `application-approve-${application.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {actionKey === `application-approve-${application.id}` ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                        Approve landlord access
                      </button>
                      <button
                        onClick={() => rejectApplication(application)}
                        disabled={actionKey === `application-reject-${application.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        {actionKey === `application-reject-${application.id}` ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                        Reject application
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "listings" && (
          <div className="mt-6">
            <div className="rounded-[28px] border border-border bg-white p-5 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Listing moderation</h2>
                  <p className="text-sm text-muted-foreground">Search, verify, promote, and retire properties.</p>
                </div>

                <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:max-w-2xl">
                  <input
                    value={listingQuery}
                    onChange={(event) => setListingQuery(event.target.value)}
                    placeholder="Search by title, city, type..."
                    className="h-11 flex-1 rounded-full border border-border bg-secondary/45 px-4 text-sm outline-none focus:border-primary"
                  />

                  <div className="flex flex-wrap gap-2">
                    {LISTING_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setListingFilter(filter.id)}
                        className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                          listingFilter === filter.id
                            ? "bg-primary text-white"
                            : "border border-border bg-white text-muted-foreground hover:border-primary/25 hover:text-primary"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {filteredProperties.length === 0 && (
                <div className="rounded-[28px] border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
                  No listings match the current filter.
                </div>
              )}

              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="rounded-[28px] border border-border bg-white p-6 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                          {property.listing_type}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPropertyStatusTone(property.status)}`}>
                          {property.status || "available"}
                        </span>
                        {property.verified && (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Verified
                          </span>
                        )}
                        {property.promoted && (
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            Promoted
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-xl font-semibold text-foreground">{property.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {property.city || "Unknown city"}
                        {property.state ? `, ${property.state}` : ""} • {property.property_type}
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Price</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">{formatNaira(property.price)}</div>
                        </div>
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Created</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">{formatDate(property.created_at)}</div>
                        </div>
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Promotion</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">
                            {property.promoted && property.promoted_until
                              ? `Until ${formatDate(property.promoted_until)}`
                              : "Not promoted"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full max-w-sm rounded-3xl border border-border bg-slate-50 p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin actions</div>
                      <div className="mt-4 grid gap-3">
                        <button
                          onClick={() =>
                            runPropertyUpdate(
                              property.id,
                              { verified: !property.verified },
                              property.verified ? "Listing verification removed" : "Listing verified",
                              `property-verify-${property.id}`,
                            )
                          }
                          disabled={actionKey === `property-verify-${property.id}`}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        >
                          {actionKey === `property-verify-${property.id}` ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                          {property.verified ? "Remove verification" : "Verify listing"}
                        </button>

                        <button
                          onClick={() =>
                            runPropertyUpdate(
                              property.id,
                              { status: property.status === "occupied" ? "available" : "occupied" },
                              property.status === "occupied" ? "Listing marked available" : "Listing marked occupied",
                              `property-status-${property.id}`,
                            )
                          }
                          disabled={actionKey === `property-status-${property.id}`}
                          className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-secondary px-4 py-3 text-sm font-semibold text-primary hover:bg-secondary/80 disabled:opacity-60"
                        >
                          {actionKey === `property-status-${property.id}` ? <Loader2 size={16} className="animate-spin" /> : <Home size={16} />}
                          {property.status === "occupied" ? "Mark available" : "Mark occupied"}
                        </button>

                        {property.promoted && (
                          <button
                            onClick={() =>
                              runPropertyUpdate(
                                property.id,
                                { promoted: false, promoted_until: null, promotion_plan: null },
                                "Promotion ended",
                                `property-promo-${property.id}`,
                              )
                            }
                            disabled={actionKey === `property-promo-${property.id}`}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                          >
                            {actionKey === `property-promo-${property.id}` ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            End promotion
                          </button>
                        )}

                        <button
                          onClick={() => deleteProperty(property)}
                          disabled={actionKey === `property-delete-${property.id}`}
                          className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                        >
                          {actionKey === `property-delete-${property.id}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          Delete listing
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "offers" && (
          <div className="mt-6 space-y-4">
            {offers.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
                No offers have been submitted yet.
              </div>
            )}

            {offers.map((offer) => {
              const property = propertyLookup.get(offer.property_id);
              const buyer = userLookup.get(offer.buyer_id);

              return (
                <div
                  key={offer.id}
                  className="rounded-[28px] border border-border bg-white p-6 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                          Offer
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          offer.status === "accepted"
                            ? "bg-emerald-50 text-emerald-700"
                            : offer.status === "rejected"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}>
                          {offer.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-foreground">
                          {property?.title || "Unknown property"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Buyer: {buyer?.full_name || "Unknown buyer"} • {formatDate(offer.created_at)}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Offer amount</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">{formatNaira(offer.offer_amount)}</div>
                        </div>
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Funding</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{offer.financing_type || "Not supplied"}</div>
                        </div>
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contact</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{offer.phone || "No phone supplied"}</div>
                        </div>
                      </div>

                      {offer.message && <p className="text-sm text-foreground">{offer.message}</p>}
                    </div>

                    <div className="w-full max-w-sm rounded-3xl border border-border bg-slate-50 p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin visibility</div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Landlords can accept or reject offers from their dashboard. Admin can monitor the negotiation trail here.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="mt-6 space-y-4">
            {bookingRequests.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
                No booking requests have been submitted yet.
              </div>
            )}

            {bookingRequests.map((booking) => {
              const property = propertyLookup.get(booking.property_id);
              const guest = userLookup.get(booking.guest_id);

              return (
                <div
                  key={booking.id}
                  className="rounded-[28px] border border-border bg-white p-6 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                          {booking.booking_type}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          booking.status === "confirmed"
                            ? "bg-emerald-50 text-emerald-700"
                            : booking.status === "declined"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}>
                          {booking.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-foreground">
                          {property?.title || "Unknown property"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Guest: {guest?.full_name || "Unknown guest"} • {formatDate(booking.created_at)}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stay starts</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{formatDate(booking.check_in_date)}</div>
                        </div>
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stay ends</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">
                            {booking.check_out_date ? formatDate(booking.check_out_date) : "Not supplied"}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quote</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">{formatNaira(booking.total_quote)}</div>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {booking.guests_count ? `${booking.guests_count} guest(s)` : ""}
                        {booking.requested_term_months ? ` • ${booking.requested_term_months} month term` : ""}
                        {booking.phone ? ` • ${booking.phone}` : ""}
                      </div>
                      {booking.notes && <p className="text-sm text-foreground">{booking.notes}</p>}
                    </div>

                    <div className="w-full max-w-sm rounded-3xl border border-border bg-slate-50 p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin visibility</div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Landlords can confirm or decline booking requests from their dashboard. Admin can review timing, totals, and response status here.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "protection" && (
          <div className="mt-6 space-y-4">
            {protectionCases.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
                No protection cases have been opened yet.
              </div>
            )}

            {protectionCases.map((entry) => {
              const property = entry.property_id ? propertyLookup.get(entry.property_id) : null;
              const requester = userLookup.get(entry.requester_id);

              return (
                <div
                  key={entry.id}
                  className="rounded-[28px] border border-border bg-white p-6 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                          {entry.category}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          entry.status === "resolved"
                            ? "bg-emerald-50 text-emerald-700"
                            : entry.status === "dismissed"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-amber-50 text-amber-700"
                        }`}>
                          {entry.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-foreground">{entry.summary}</h3>
                        <p className="text-sm text-muted-foreground">
                          {property?.title || "General case"} • {requester?.full_name || "Unknown requester"} • {formatDate(entry.created_at)}
                        </p>
                      </div>

                      {entry.details && <p className="text-sm text-foreground">{entry.details}</p>}

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Priority</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{entry.priority}</div>
                        </div>
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phone</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{entry.phone || "No phone supplied"}</div>
                        </div>
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{entry.status}</div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full max-w-sm rounded-3xl border border-border bg-slate-50 p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Case actions</div>
                      <div className="mt-4 grid gap-3">
                        <button
                          onClick={() => updateProtectionStatus(entry, "investigating")}
                          disabled={actionKey === `protection-${entry.id}-investigating`}
                          className="rounded-2xl border border-primary/20 bg-secondary px-4 py-3 text-sm font-semibold text-primary hover:bg-secondary/80 disabled:opacity-60"
                        >
                          Investigate
                        </button>
                        <button
                          onClick={() => updateProtectionStatus(entry, "resolved")}
                          disabled={actionKey === `protection-${entry.id}-resolved`}
                          className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        >
                          Mark resolved
                        </button>
                        <button
                          onClick={() => updateProtectionStatus(entry, "dismissed")}
                          disabled={actionKey === `protection-${entry.id}-dismissed`}
                          className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
