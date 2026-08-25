export interface Property {
  id: string;
  title: string;
  description: string | null;
  writeup: string | null;
  price: number;
  price_label: string | null;
  listing_type: string;
  property_type: string;
  unit_type?: string | null;
  beds: number | null;
  baths: number | null;
  size: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  rating: number | null;
  reviews_count: number | null;
  verified: boolean | null;
  amenities: string[] | null;
  agent_name: string | null;
  agent_title: string | null;
  agent_phone: string | null;
  video_url?: string | null;
  images: string[] | null;
  user_id: string;
  promoted?: boolean;
  promoted_until?: string;
  promotion_plan?: string;
  status?: string | null;
}

export const CATEGORIES = [
  { id: "all", icon: "🏘", label: "All homes" },
  { id: "Short Let", icon: "✨", label: "Short let" },
  { id: "For Rent", icon: "🏠", label: "For rent" },
  { id: "For Sale", icon: "🔑", label: "For sale" },
  { id: "Land", icon: "📍", label: "Land" },
  { id: "Hotel", icon: "🏪", label: "Hotels" },
  { id: "Duplex", icon: "🏡", label: "Duplexes" },
  { id: "Apartment", icon: "🏢", label: "Apartments" },
  { id: "Penthouse", icon: "🌅", label: "Penthouses" },
];

export const SEED_LISTINGS: Omit<Property, "user_id">[] = [
  {id:"seed-1",title:"Luxury 5-Bed Duplex with Pool — GRA Phase 3",description:"An exquisite modern duplex offering unparalleled comfort in the heart of GRA Phase 3, Port Harcourt.",writeup:"This property represents the pinnacle of luxury living in Port Harcourt. Situated on a quiet, tree-lined street in GRA Phase 3, the duplex was designed with tropical modernism and everyday livability in mind.\n\nThe ground floor features a grand entrance foyer, an open-plan chef's kitchen, a formal dining area, and a sunlit living room with high ceilings. The master suite upstairs is a true sanctuary with a spa ensuite and walk-in closet.",price:120000000,price_label:"",listing_type:"For Sale",property_type:"Duplex",beds:5,baths:6,size:"650 sqm",city:"GRA Phase 3",state:"Rivers",address:"14 Ada George Road, GRA Phase 3",rating:4.9,reviews_count:23,verified:true,amenities:["Swimming Pool","24/7 Generator","Smart Home System","CCTV & Security","Boys Quarters","Home Gym"],agent_name:"Emeka Okafor",agent_title:"Senior Property Consultant",agent_phone:"+234 801 234 5678",images:["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80","https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=400&q=80"]},
  {id:"seed-2",title:"Serviced 3-Bed Apartment — Old GRA",description:"Contemporary apartment in the prestigious Old GRA neighbourhood. Fully serviced with 24/7 power.",writeup:"Welcome to elevated city living at its finest. This meticulously appointed apartment in Old GRA commands views of the well-maintained neighbourhood.\n\nThe open-concept living space is bathed in natural light. The kitchen features integrated appliances and a breakfast island.",price:5500000,price_label:"/ year",listing_type:"For Rent",property_type:"Apartment",beds:3,baths:3,size:"220 sqm",city:"Old GRA",state:"Rivers",address:"12 Aba Road, Old GRA",rating:4.95,reviews_count:41,verified:true,amenities:["24/7 Power Supply","Concierge Service","Residents Gym","Covered Parking","CCTV","Backup Generator"],agent_name:"Chioma Eze",agent_title:"Luxury Property Specialist",agent_phone:"+234 802 345 6789",images:["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80","https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80","https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80"]},
  {id:"seed-3",title:"Beachfront Short Let — Bonny Island",description:"Luxurious waterfront apartment for short stays with stunning views of the Bonny River.",writeup:"This spectacular apartment sits directly on the waterfront within Bonny Island, offering unobstructed river views from every room.\n\nThe wrap-around terrace is where mornings belong.",price:150000,price_label:"/ night",listing_type:"Short Let",property_type:"Penthouse",beds:3,baths:3,size:"280 sqm",city:"Bonny Island",state:"Rivers",address:"Bonny Waterfront Estate",rating:5.0,reviews_count:18,verified:true,amenities:["Waterfront Access","Smart TV & Sound System","Fibre Internet","Daily Housekeeping","Chef On Request","Airport Transfer"],agent_name:"Ngozi Okonkwo",agent_title:"Short Let Specialist",agent_phone:"+234 806 789 0123",images:["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=80","https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400&q=80","https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&q=80"]},
  {id:"seed-4",title:"Modern 4-Bed Terrace — Woji Estate",description:"Spacious 4-bedroom terrace in the serene, family-friendly Woji Estate.",writeup:"This beautifully maintained terrace house is the perfect family home — combining generous space, modern finishes, and security.\n\nFour well-proportioned bedrooms each have their own ensuite. The estate offers wide streets and 24-hour roving security.",price:6000000,price_label:"/ year",listing_type:"For Rent",property_type:"Terrace",beds:4,baths:4,size:"350 sqm",city:"Woji",state:"Rivers",address:"5 Woji Estate Road, Woji",rating:4.7,reviews_count:12,verified:true,amenities:["24hr Estate Security","Generator","Boys Quarters","Private Garden","Covered Parking"],agent_name:"Tunde Bakare",agent_title:"Residential Property Expert",agent_phone:"+234 805 678 9012",images:["https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900&q=80","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80","https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80"]},
  {id:"seed-5",title:"Executive Short Let — Trans Amadi",description:"Fully furnished 2-bedroom apartment in central Trans Amadi. Ready to move in.",writeup:"Corporate travellers and extended-stay guests will feel right at home in this tastefully furnished apartment in the Trans Amadi industrial area.\n\nMinutes from major oil & gas company offices.",price:100000,price_label:"/ night",listing_type:"Short Let",property_type:"Apartment",beds:2,baths:2,size:"120 sqm",city:"Trans Amadi",state:"Rivers",address:"22 Trans Amadi Industrial Layout",rating:4.8,reviews_count:34,verified:true,amenities:["Fibre Internet","DSTV Premium","Fully Furnished","24hr Generator","Inverter Backup"],agent_name:"Bola Adeyemi",agent_title:"Short Let Specialist",agent_phone:"+234 804 567 8901",images:["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80","https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=400&q=80","https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80"]},
  {id:"seed-6",title:"Prime Land — Rumuokoro (1,500 sqm, C of O)",description:"Rare dry land along the East-West Road corridor with Certificate of Occupancy.",writeup:"This is one of the most exceptional land opportunities in Port Harcourt. The 1,500 sqm plot sits along the major East-West Road.\n\nIdeal for commercial or residential development. Serious buyers only.",price:45000000,price_label:"",listing_type:"For Sale",property_type:"Land",beds:0,baths:0,size:"1,500 sqm",city:"Rumuokoro",state:"Rivers",address:"East-West Road, Rumuokoro",rating:4.6,reviews_count:5,verified:true,amenities:["Certificate of Occupancy","Dry Land","Tarred Road","Drainage System","Utility Access"],agent_name:"Adaeze Nwosu",agent_title:"Commercial Property Director",agent_phone:"+234 803 456 7890",images:["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&q=80","https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80","https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80"]},
];

export function formatPrice(n: number): string {
  if (n >= 1e9) return "₦" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "₦" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "₦" + (n / 1e3).toFixed(0) + "K";
  return "₦" + n;
}

export function formatFullPrice(n: number): string {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(n);
}
