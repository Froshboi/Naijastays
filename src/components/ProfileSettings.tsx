import { useEffect, useState } from "react";
import { Camera, Loader2, Save, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function ProfileSettings() {
  const { user, profile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.full_name || "");
    setPhone(profile?.phone || "");
    setAvatarUrl(profile?.avatar_url || null);
  }, [profile]);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("profile-images").upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
  };

  const saveProfile = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const { error } = await supabase.from("profiles").update({ full_name: name.trim() || null, phone: phone.trim() || null, avatar_url: avatarUrl }).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (error: any) {
      toast.error(error.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2 text-sm font-bold text-primary"><UserRound size={16} /> Your public profile</div><p className="mt-1 text-xs text-muted-foreground">This appears beside your listings and helps users know who they are dealing with.</p></div>
        <button onClick={saveProfile} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save profile</button>
      </div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <label className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-bold text-primary">
          {avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : <UserRound size={28} />}
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100"><Camera size={18} /></span>
          <input type="file" accept="image/*" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { await uploadAvatar(file); toast.success("Photo ready to save"); } catch (error: any) { toast.error(error.message || "Upload failed"); } }} />
        </label>
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-primary" /><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone number" className="h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-primary" /></div>
      </div>
    </section>
  );
}
