import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RoleSelectionModalProps {
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function RoleSelectionModal({ userId, onComplete, onSkip }: RoleSelectionModalProps) {
  const [selected, setSelected] = useState<"client" | "landlord" | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);

    const roleToAssign = selected === "landlord" ? "client" : selected;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: roleToAssign });

    if (error) {
      toast.error("Failed to save role, please try again");
      setLoading(false);
      return;
    }

    if (selected === "landlord") {
      const { error: applicationError } = await supabase
        .from("landlord_applications")
        .insert({
          user_id: userId,
          role_requested: "landlord",
          status: "pending",
        });

      if (applicationError) {
        toast.error("Failed to submit landlord application. Please try again.");
        setLoading(false);
        return;
      }

      toast.success("Landlord application submitted. An admin will review your request shortly.");
    } else {
      toast.success("Welcome! You're registered as a Tenant.");
    }

    onComplete();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_35px_80px_-35px_rgba(21,128,61,0.55)] border border-primary/10">
        <div className="mb-2 text-center">
          <h2 className="text-2xl font-bold text-gray-900">One last thing</h2>
          <p className="mt-1 text-sm text-gray-500">How will you be using NaijaStays?</p>
        </div>

        <div className="flex gap-4 mb-4 mt-6">
          {(["client", "landlord"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelected(r)}
              className={`flex-1 rounded-xl border-2 px-4 py-6 text-center transition-all ${
                selected === r
                  ? "border-primary bg-secondary"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-3xl mb-2">{r === "client" ? "🏠" : "🏢"}</div>
              <div className="font-semibold text-gray-900">
                {r === "client" ? "Tenant / Guest" : "Landlord / Host"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {r === "client"
                  ? "I'm looking for a place to rent or stay"
                  : "I want to list my property"}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selected || loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-colors disabled:opacity-50 mb-3"
        >
          {loading ? "Saving…" : "Continue"}
        </button>

        {selected === "landlord" && (
          <p className="text-xs text-muted-foreground mb-3">
            Landlord accounts require admin approval before you can list properties. We will review your application within 24 hours.
          </p>
        )}

        <button
          onClick={onSkip}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Browse as guest for now
        </button>
      </div>
    </div>
  );
}
