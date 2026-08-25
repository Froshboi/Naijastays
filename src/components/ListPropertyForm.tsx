import { useEffect, useState } from "react";
import { 
  Upload, X, Video, Loader, ChevronLeft, ChevronRight, 
  Building2, MapPin, User, Phone, Briefcase, DollarSign, 
  Bed, Bath, Ruler, Tag, Home, Plus, GripVertical, Check 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const CLOUDINARY_CLOUD = "duwx0zo19";
const CLOUDINARY_PRESET = "naijastays_videos";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const UNIT_TYPES = [
  "Self Contain", "Mini Flat", "1 Bedroom", "2 Bedroom", "3 Bedroom",
  "4+ Bedroom", "Bungalow", "Mansion", "Penthouse", "Duplex",
  "Terrace", "Commercial Space", "Warehouse", "Office Space",
];

const PROPERTY_TYPES = [
  "Apartment", "Duplex", "Terrace", "Penthouse", "Hotel", 
  "Land", "Commercial", "Bungalow", "Mansion"
];

const AMENITIES_LIST = [
  "Air Conditioning", "Swimming Pool", "Parking", "Security", "CCTV", 
  "Generator", "Water Treatment", "Internet", "Gym", "Elevator",
  "Balcony", "Garden", "Furnished", "POP Ceiling", "Kitchen",
  "Wardrobe", "Jacuzzi", "Smart Home", "Solar Power", "BQ",
  "Tiled Floor", "Intercom", "Gate House", "Covered Parking"
];

const ROOM_AMENITIES = [
  "Air Conditioning", "TV", "Mini Fridge", "Balcony", "Sea View", 
  "City View", "Bathtub", "Kitchenette", "Free WiFi", "Room Service", 
  "Safe", "Desk", "Soundproofing", "Coffee Machine", "Iron"
];

const CANCELLATION_POLICIES = [
  { value: "free", label: "Free cancellation" },
  { value: "24h", label: "Cancel 24h before check-in" },
  { value: "48h", label: "Cancel 48h before check-in" },
  { value: "non_refundable", label: "Non-refundable" },
];

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

interface RoomType {
  name: string;
  description: string;
  price_per_night: number;
  max_guests: number;
  bed_count: number;
  available_count: number;
  total_count: number;
  amenities: string[];
  images: string[];
  cancellation_policy: string;
}

export default function ListPropertyForm({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Media state
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    writeup: "",
    price: "",
    price_label: "",
    listing_type: "For Sale",
    property_type: "Apartment",
    unit_type: "",
    beds: "0",
    baths: "0",
    size: "",
    city: "",
    state: "Rivers",
    address: "",
    agent_name: "",
    agent_title: "",
    agent_phone: "",
  });

  const [amenities, setAmenities] = useState<string[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  const isHotel = form.property_type === "Hotel";

  // Auto-cleanup video preview
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "listing_type") {
      let label = "";
      if (value === "For Rent") label = "/ year";
      if (value === "Short Let") label = "/ night";
      setForm(prev => ({ ...prev, [name]: value, price_label: label }));
    } else if (name === "property_type") {
      const updates: any = { [name]: value };
      if (value === "Hotel") {
        updates.listing_type = "Short Let";
        updates.price_label = "/ night";
        updates.beds = "0";
        updates.baths = "0";
        updates.size = "";
        updates.unit_type = "";
      }
      setForm(prev => ({ ...prev, ...updates }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  // Images
  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    setImages(prev => [...prev, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // Video
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { toast.error("Video must be under 100MB"); return; }
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    
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
        if (res.secure_url) {
          setVideoUrl(res.secure_url);
          toast.success("✅ Video uploaded and compressed!");
        } else {
          toast.error("Video upload failed");
          setVideo(null);
        }
        setVideoUploading(false);
      };
      xhr.onerror = () => {
        toast.error("Video upload failed");
        setVideo(null);
        setVideoUploading(false);
      };
      xhr.send(formData);
    } catch (err: any) {
      toast.error(err.message || "Video upload failed");
      setVideo(null);
      setVideoUploading(false);
    }
  };

  const removeVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideo(null);
    setVideoUrl(null);
    setVideoPreviewUrl(null);
    setVideoProgress(0);
  };

  // Room Types Manager
  const addRoomType = () => {
    setRoomTypes(prev => [...prev, {
      name: "",
      description: "",
      price_per_night: 0,
      max_guests: 2,
      bed_count: 1,
      available_count: 1,
      total_count: 1,
      amenities: [],
      images: [],
      cancellation_policy: "free",
    }]);
  };

  const updateRoom = (idx: number, patch: Partial<RoomType>) => {
    setRoomTypes(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const removeRoomType = (idx: number) => {
    setRoomTypes(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleRoomAmenity = (roomIdx: number, amenity: string) => {
    const room = roomTypes[roomIdx];
    const has = room.amenities.includes(amenity);
    updateRoom(roomIdx, { 
      amenities: has ? room.amenities.filter(a => a !== amenity) : [...room.amenities, amenity] 
    });
  };

  // Validation
  const validateStep = (): string | null => {
    if (step === 1) {
      if (!form.title.trim()) return "Property title is required";
      if (!form.city.trim()) return "City is required";
      if (!form.state.trim()) return "State is required";
      if (!form.address.trim()) return "Address is required";
      if (!form.agent_name.trim()) return "Agent name is required";
      if (!form.agent_phone.trim()) return "Agent phone is required";
    }
    if (step === 2) {
      if (images.length === 0) return "At least 1 property photo is required";
    }
    if (step === 3) {
      if (!isHotel) {
        if (!form.price) return "Price is required";
      }
      if (isHotel) {
        if (roomTypes.length === 0) return "Hotels need at least one room type";
        for (let i = 0; i < roomTypes.length; i++) {
          const r = roomTypes[i];
          if (!r.name.trim()) return `Room ${i + 1} needs a name`;
          if (!r.price_per_night || r.price_per_night <= 0) return `Room ${i + 1} needs a valid price`;
          if (!r.total_count || r.total_count <= 0) return `Room ${i + 1} needs at least 1 total room`;
        }
      }
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setStep(s => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please log in first"); return; }
    
    const err = validateStep();
    if (err) { toast.error(err); return; }
    if (videoUploading) { toast.error("Please wait for video upload to complete"); return; }
    
    setLoading(true);
    try {
      // 1. Upload images
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

      // 2. Create property
      const propertyPrice = isHotel && roomTypes.length > 0
        ? Math.min(...roomTypes.map(r => r.price_per_night)) // Hotel "starts from" price
        : parseInt(form.price) || 0;

      const { data: property, error: propError } = await supabase
        .from("properties")
        .insert({
          user_id: user.id,
          title: form.title,
          description: form.description,
          writeup: form.writeup,
          price: propertyPrice,
          price_label: isHotel ? "/ night" : form.price_label,
          listing_type: form.listing_type,
          property_type: form.property_type,
          unit_type: isHotel ? null : (form.unit_type || null),
          beds: isHotel ? 0 : parseInt(form.beds) || 0,
          baths: isHotel ? 0 : parseInt(form.baths) || 0,
          size: isHotel ? null : form.size,
          city: form.city,
          state: form.state,
          address: form.address,
          amenities: amenities,
          agent_name: form.agent_name,
          agent_title: form.agent_title,
          agent_phone: form.agent_phone,
          images: imageUrls,
          video_url: videoUrl || null,
          status: "available",
        })
        .select()
        .single();

      if (propError) throw propError;
      if (!property) throw new Error("Failed to create property");

      // 3. If hotel, insert room types
      if (isHotel && roomTypes.length > 0) {
        const roomInserts = roomTypes.map(room => ({
          property_id: property.id,
          name: room.name,
          description: room.description,
          price_per_night: room.price_per_night,
          max_guests: room.max_guests,
          bed_count: room.bed_count,
          available_count: room.available_count,
          total_count: room.total_count,
          amenities: room.amenities,
          images: room.images.length > 0 ? room.images : null,
          cancellation_policy: room.cancellation_policy,
        }));

        const { error: roomsError } = await supabase
          .from("property_room_types")
          .insert(roomInserts);

        if (roomsError) throw roomsError;
      }

      toast.success(
        isHotel 
          ? `🏨 ${property.title} listed with ${roomTypes.length} room types!` 
          : "Property listed successfully!"
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to list property");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: "Basics", icon: Home },
    { num: 2, label: "Media & Details", icon: Tag },
    { num: 3, label: "Pricing & Rooms", icon: isHotel ? Building2 : DollarSign },
  ];

  return (
    <div className="fixed inset-0 bg-foreground/45 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-2xl w-full max-w-[640px] max-h-[92vh] overflow-y-auto shadow-xl flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {isHotel ? "List a Hotel" : "List a Property"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step {step} of 3 · {steps[step - 1].label}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={22} />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10" />
            {steps.map((s, i) => {
              const Icon = s.icon;
              const active = step === s.num;
              const completed = step > s.num;
              return (
                <div key={s.num} className="flex flex-col items-center gap-1.5 bg-card px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    active ? "bg-primary text-primary-foreground border-primary" :
                    completed ? "bg-primary/10 text-primary border-primary/30" :
                    "bg-card text-muted-foreground border-border"
                  }`}>
                    {completed ? <Check size={14} /> : <Icon size={14} />}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                    active ? "text-primary" : completed ? "text-primary/70" : "text-muted-foreground"
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          
          {/* ========== STEP 1: BASICS ========== */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Property Title *
                </label>
                <input 
                  name="title" value={form.title} onChange={handleChange} 
                  placeholder="e.g. Stunning 3-Bed Duplex in Lekki" required
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Listing Type</label>
                  <select 
                    name="listing_type" value={form.listing_type} onChange={handleChange}
                    disabled={isHotel}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card disabled:opacity-50"
                  >
                    <option>For Sale</option>
                    <option>For Rent</option>
                    <option>Short Let</option>
                  </select>
                  {isHotel && <p className="text-[10px] text-amber-600 mt-1">Hotels are always Short Let</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Property Type</label>
                  <select 
                    name="property_type" value={form.property_type} onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card"
                  >
                    {PROPERTY_TYPES.map(pt => <option key={pt}>{pt}</option>)}
                  </select>
                </div>
              </div>

              {!isHotel && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Unit Type <span className="font-normal text-naija-faint">(optional)</span>
                  </label>
                  <select 
                    name="unit_type" value={form.unit_type} onChange={handleChange}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card"
                  >
                    <option value="">Select unit type…</option>
                    {UNIT_TYPES.map(ut => <option key={ut} value={ut}>{ut}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">City *</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      name="city" value={form.city} onChange={handleChange} 
                      placeholder="Port Harcourt" required
                      className="w-full pl-8 pr-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">State *</label>
                  <input 
                    name="state" value={form.state} onChange={handleChange} 
                    placeholder="Rivers" required
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Full Address *</label>
                <input 
                  name="address" value={form.address} onChange={handleChange} 
                  placeholder="123 Estate Road, GRA Phase 2" required
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" 
                />
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Agent / Landlord Details</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Name *</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        name="agent_name" value={form.agent_name} onChange={handleChange} 
                        placeholder="Your name" required
                        className="w-full pl-8 pr-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Title</label>
                    <div className="relative">
                      <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        name="agent_title" value={form.agent_title} onChange={handleChange} 
                        placeholder="e.g. Consultant"
                        className="w-full pl-8 pr-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Phone *</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        name="agent_phone" value={form.agent_phone} onChange={handleChange} 
                        placeholder="+234..." required
                        className="w-full pl-8 pr-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP 2: MEDIA & DETAILS ========== */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Images */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  Property Images <span className="text-destructive">*</span> <span className="font-normal text-muted-foreground">({images.length}/5)</span>
                </label>
                {images.length === 0 && (
                  <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
                    <span>📸</span> At least 1 photo is required to list your property
                  </div>
                )}
                <div className="flex gap-2 flex-wrap mb-2">
                  {previews.map((p, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                      <button 
                        type="button" onClick={() => removeImage(i)} 
                        className="absolute top-0.5 right-0.5 bg-foreground/70 text-card rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-primary/90 text-white text-[9px] font-bold text-center py-0.5">
                          COVER
                        </span>
                      )}
                    </div>
                  ))}
                  {images.length < 5 && (
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                      <Upload size={16} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">Add</span>
                      <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">First image becomes the cover photo. Drag-to-reorder coming soon.</p>
              </div>

              {/* Video */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  Property Video <span className="font-normal text-naija-faint">(optional · max 100MB)</span>
                </label>
                {!video ? (
                  <label className="flex items-center gap-3 w-full border-2 border-dashed border-border rounded-lg px-4 py-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                    <Video size={18} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Upload a walkthrough video</p>
                      <p className="text-xs text-naija-faint">MP4, MOV · Auto-compressed by Cloudinary</p>
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
                        <button type="button" onClick={removeVideo} className="text-muted-foreground hover:text-destructive">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {videoUploading ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Loader size={12} className="animate-spin text-primary" />
                          <span className="text-xs text-primary font-semibold">Uploading… {videoProgress}%</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${videoProgress}%` }} />
                        </div>
                      </div>
                    ) : videoUrl ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-green-600 font-semibold">✓ Ready</span>
                        </div>
                        <video
                          src={videoUrl}
                          controls muted playsInline preload="metadata"
                          className="w-full max-h-48 rounded-lg object-cover bg-black"
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Short Description</label>
                <textarea 
                  name="description" value={form.description} onChange={handleChange} 
                  rows={2} placeholder="Brief highlight of the property…"
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card resize-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Full Writeup</label>
                <textarea 
                  name="writeup" value={form.writeup} onChange={handleChange} 
                  rows={4} placeholder="Detailed description, neighborhood info, rules…"
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-card resize-none" 
                />
              </div>

              {/* Amenities Chips */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  Amenities <span className="font-normal text-muted-foreground">({amenities.length} selected)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES_LIST.map((amenity) => {
                    const active = amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {active && <Check size={10} className="inline mr-1" />}
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP 3: PRICING & ROOMS ========== */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {!isHotel ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Price (₦) *</label>
                      <div className="relative">
                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                          name="price" value={form.price} onChange={handleChange} 
                          type="number" placeholder="45000000" required
                          className="w-full pl-8 pr-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Price Label</label>
                      <div className="relative">
                        <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                          name="price_label" value={form.price_label} onChange={handleChange} 
                          placeholder="/ year"
                          className="w-full pl-8 pr-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Beds</label>
                      <div className="relative">
                        <Bed size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                          name="beds" value={form.beds} onChange={handleChange} type="number" min="0"
                          className="w-full pl-8 pr-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Baths</label>
                      <div className="relative">
                        <Bath size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                          name="baths" value={form.baths} onChange={handleChange} type="number" min="0"
                          className="w-full pl-8 pr-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Size</label>
                      <div className="relative">
                        <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                          name="size" value={form.size} onChange={handleChange} 
                          placeholder="650 sqm"
                          className="w-full pl-8 pr-3.5 py-2.5 border border-border rounded-lg text-sm bg-card" 
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Building2 size={16} className="text-primary" />
                        Room Types & Suites
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Add every bookable category. Guests will pick from these.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addRoomType}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Plus size={14} /> Add Room
                    </button>
                  </div>

                  {roomTypes.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center">
                      <Building2 size={24} className="text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No rooms added yet. Add your first room type.
                      </p>
                      <button
                        type="button"
                        onClick={addRoomType}
                        className="mt-3 text-xs font-semibold text-primary hover:underline"
                      >
                        Add Standard Room
                      </button>
                    </div>
                  )}

                  {roomTypes.map((room, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-card p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-muted-foreground" />
                          <span className="text-xs font-bold uppercase tracking-wider text-primary">
                            Room Type {idx + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRoomType(idx)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Room Name *</label>
                          <input
                            value={room.name}
                            onChange={(e) => updateRoom(idx, { name: e.target.value })}
                            placeholder="e.g. Executive Suite with Sea View"
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Price / Night (₦) *</label>
                          <input
                            type="number"
                            value={room.price_per_night || ""}
                            onChange={(e) => updateRoom(idx, { price_per_night: parseInt(e.target.value) || 0 })}
                            placeholder="75000"
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Cancellation</label>
                          <select
                            value={room.cancellation_policy}
                            onChange={(e) => updateRoom(idx, { cancellation_policy: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card"
                          >
                            {CANCELLATION_POLICIES.map(p => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Max Guests</label>
                          <input
                            type="number" min={1}
                            value={room.max_guests}
                            onChange={(e) => updateRoom(idx, { max_guests: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Beds</label>
                          <input
                            type="number" min={1}
                            value={room.bed_count}
                            onChange={(e) => updateRoom(idx, { bed_count: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Available Now</label>
                          <input
                            type="number" min={0}
                            value={room.available_count}
                            onChange={(e) => updateRoom(idx, { available_count: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Total Rooms</label>
                          <input
                            type="number" min={1}
                            value={room.total_count}
                            onChange={(e) => updateRoom(idx, { total_count: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-2">Room Amenities</label>
                        <div className="flex flex-wrap gap-1.5">
                          {ROOM_AMENITIES.map((amenity) => {
                            const active = room.amenities.includes(amenity);
                            return (
                              <button
                                key={amenity}
                                type="button"
                                onClick={() => toggleRoomAmenity(idx, amenity)}
                                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                  active
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                }`}
                              >
                                {amenity}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Description</label>
                        <textarea
                          value={room.description}
                          onChange={(e) => updateRoom(idx, { description: e.target.value })}
                          rows={2}
                          placeholder="What makes this room special?"
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3 pt-2 sticky bottom-0 bg-card pb-2">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-3 border border-border rounded-lg text-sm font-semibold hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Next Step <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || videoUploading}
                className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader size={16} className="animate-spin" /> Listing…</>
                ) : videoUploading ? (
                  "Waiting for video…"
                ) : (
                  `List ${isHotel ? "Hotel" : "Property"}`
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}