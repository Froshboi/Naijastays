import { useEffect, useState } from "react";
import { Upload, X, Video, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const CLOUDINARY_CLOUD = "duwx0zo19";
const CLOUDINARY_PRESET = "naijastays_videos";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const resizeImage = (file: File, maxWidth = 1200, quality = 0.85): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", quality);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
};

export default function ListPropertyForm({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [form, setForm] = useState({
    title: "", description: "", writeup: "", price: "", price_label: "",
    listing_type: "For Sale", property_type: "Apartment",
    beds: "0", baths: "0", size: "", city: "", state: "Rivers", address: "",
    amenities: "", agent_name: "", agent_title: "", agent_phone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    setImages([...images, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { toast.error("Video must be under 100MB"); return; }
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideo(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setVideoUploading(true);
    setVideoProgress(0);
    toast.info("Uploading and compressing video…");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_PRESET);
      formData.append("resource_type", "video");
      formData.append("quality", "auto");
      formData.append("fetch_format", "auto");
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setVideoProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        const res = JSON.parse(xhr.responseText);
        if (res.secure_url) { setVideoUrl(res.secure_url); toast.success("✅ Video uploaded and compressed!"); }
        else { toast.error("Video upload failed"); setVideo(null); }
        setVideoUploading(false);
      };
      xhr.onerror = () => { toast.error("Video upload failed"); setVideo(null); setVideoUploading(false); };
      xhr.send(formData);
    } catch (err: any) {
      toast.error(err.message || "Video upload failed");
      setVideo(null);
      setVideoUploading(false);
    }
  };

  const removeVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideo(null);
    setVideoUrl(null);
    setVideoPreviewUrl(null);
    setVideoProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title || !form.price) { toast.error("Title and price are required"); return; }
    if (images.length === 0) {
      toast.error("📸 You need at least 1 photo to finish your listing");
      return;
    }
    if (videoUploading) { toast.error("Please wait for video upload to complete"); return; }
    setLoading(true);
    try {
      const imageUrls: string[] = [];
      for (const file of images) {
        const resized = await resizeImage(file);
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(path, resized, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }
      const { error } = await supabase.from("properties").insert({
        user_id: user.id,
        title: form.title,
        description: form.description,
        writeup: form.writeup,
        price: parseInt(form.price) || 0,
        price_label: form.price_label,
        listing_type: form.listing_type,
        property_type: form.property_type,
        beds: parseInt(form.beds) || 0,
        baths: parseInt(form.baths) || 0,
        size: form.size,
        city: form.city,
        state: form.state,
        address: form.address,
        amenities: form.amenities.split(",").map((a) => a.trim()).filter(Boolean),
        agent_name: form.agent_name,
        agent_title: form.agent_title,
        agent_phone: form.agent_phone,
        images: imageUrls,
        video_url: videoUrl || null,
        status: "available",
      });
      if (error) throw error;
      toast.success("Property listed successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to list property");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground/45 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-display text-xl font-semibold">List a Property</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Images */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              Property Images (max 5) <span className="text-destructive">*</span>
            </label>
            {images.length === 0 && (
              <div className="mb-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                📸 At least 1 photo is required to list your property
              </div>
            )}
            <div className="flex gap-2 flex-wrap mb-2">
              {previews.map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={p} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-foreground/70 text-card rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <Upload size={16} className="text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
                  <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Video */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              Property Video <span className="text-naija-faint font-normal">(optional · max 100MB · auto-compressed)</span>
            </label>
            {!video ? (
              <label className="flex items-center gap-3 w-full border-2 border-dashed border-border rounded-lg px-4 py-3 cursor-pointer hover:border-primary transition-colors">
                <Video size={18} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Upload a property walkthrough video</p>
                  <p className="text-xs text-naija-faint">MP4, MOV supported · Cloudinary auto-compresses on upload</p>
                </div>
                <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
              </label>
            ) : (
              <div className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Video size={16} className="text-primary shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{video.name}</span>
                  </div>
                  {!videoUploading && (
                    <button type="button" onClick={removeVideo} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                  )}
                </div>
                {videoUploading ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Loader size={12} className="animate-spin text-primary" />
                      <span className="text-xs text-primary font-semibold">Uploading & compressing… {videoProgress}%</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${videoProgress}%` }} />
                    </div>
                  </div>
                ) : videoUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-green-600 font-semibold">✓ Video ready</span>
                      <span className="text-xs text-muted-foreground">· Compressed by Cloudinary</span>
                    </div>
                    <video
                      src={videoUrl || videoPreviewUrl || undefined}
                      controls
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full max-h-52 rounded-lg object-cover bg-black"
                    />
                  </div>
                ) : videoPreviewUrl ? (
                  <video
                    src={videoPreviewUrl}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full max-h-52 rounded-lg object-cover bg-black"
                  />
                ) : null}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Title *</label>
            <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Stunning 3-Bed Duplex in Lekki" required
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Listing Type</label>
              <select name="listing_type" value={form.listing_type} onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card">
                <option>For Sale</option><option>For Rent</option><option>Short Let</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Property Type</label>
              <select name="property_type" value={form.property_type} onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card">
                <option>Apartment</option><option>Duplex</option><option>Terrace</option><option>Penthouse</option><option>Hotel</option><option>Land</option><option>Commercial</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Price (₦) *</label>
              <input name="price" value={form.price} onChange={handleChange} type="number" placeholder="e.g. 450000000" required
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Price Label</label>
              <input name="price_label" value={form.price_label} onChange={handleChange} placeholder="e.g. / year, / night"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Beds</label>
              <input name="beds" value={form.beds} onChange={handleChange} type="number"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Baths</label>
              <input name="baths" value={form.baths} onChange={handleChange} type="number"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Size</label>
              <input name="size" value={form.size} onChange={handleChange} placeholder="e.g. 650 sqm"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">City</label>
              <input name="city" value={form.city} onChange={handleChange} placeholder="e.g. Port Harcourt"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">State</label>
              <input name="state" value={form.state} onChange={handleChange} placeholder="Rivers"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Address</label>
            <input name="address" value={form.address} onChange={handleChange} placeholder="Full property address"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Brief description..."
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Writeup</label>
            <textarea name="writeup" value={form.writeup} onChange={handleChange} rows={4} placeholder="Detailed property writeup..."
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Amenities (comma separated)</label>
            <input name="amenities" value={form.amenities} onChange={handleChange} placeholder="Pool, Generator, CCTV, Gym"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Agent Name</label>
              <input name="agent_name" value={form.agent_name} onChange={handleChange} placeholder="Your name"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Agent Title</label>
              <input name="agent_title" value={form.agent_title} onChange={handleChange} placeholder="e.g. Consultant"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Agent Phone</label>
              <input name="agent_phone" value={form.agent_phone} onChange={handleChange} placeholder="+234..."
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" />
            </div>
          </div>

          <button type="submit" disabled={loading || videoUploading}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? "Listing property..." : videoUploading ? "Waiting for video upload..." : "List Property"}
          </button>
        </form>
      </div>
    </div>
  );
}
