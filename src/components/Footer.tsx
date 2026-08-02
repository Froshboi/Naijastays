import { Link } from "react-router-dom";

const propertyLinks = [
  {
    label: "For Sale",
    to: { pathname: "/", search: "?category=For%20Sale", hash: "#listings" },
  },
  {
    label: "For Rent",
    to: { pathname: "/", search: "?category=For%20Rent", hash: "#listings" },
  },
  {
    label: "Short Let",
    to: { pathname: "/", search: "?category=Short%20Let", hash: "#listings" },
  },
  {
    label: "Land & Commercial",
    to: { pathname: "/", search: "?preset=land-commercial", hash: "#listings" },
  },
] as const;

const companyLinks = [
  { label: "About Us", to: "/about" },
  { label: "Our Agents", to: "/agents" },
  { label: "Careers", to: "/careers" },
  { label: "Blog", to: "/blog" },
] as const;

export default function Footer() {
  return (
    <footer className="shrink-0 bg-[#0f2618] text-card-foreground pt-12 px-4 md:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 pb-12">
        <div>
          <div className="font-display text-[22px] font-semibold text-card mb-3">
            Naija<span className="text-primary">Stays</span>
          </div>
          <p className="text-sm text-card/60 leading-relaxed max-w-[260px]">
            Your Naija home for trusted buying, selling, and renting. We make verified property deals feel simpler from Port Harcourt outward.
          </p>
        </div>
        <div>
          <h4 className="text-[11px] font-bold tracking-widest uppercase text-card/40 mb-4">Properties</h4>
          <div className="flex flex-col gap-2.5">
            {propertyLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm text-card/55 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-[11px] font-bold tracking-widest uppercase text-card/40 mb-4">Company</h4>
          <div className="flex flex-col gap-2.5">
            {companyLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm text-card/55 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-[11px] font-bold tracking-widest uppercase text-card/40 mb-4">Contact</h4>
          <div className="flex flex-col gap-2.5">
            <span className="text-sm text-card/55">📍 No 85 Oluobasenjo Road, Visa Karena</span>
            <span className="text-sm text-card/55">📞 09060303273</span>
            <span className="text-sm text-card/55">✉ niajastay@gmail.com</span>
          </div>
        </div>
      </div>
      <div className="border-t border-card/10 py-5 text-center text-xs text-card/35">
        © 2026 NaijaStays. All rights reserved. Made with ❤ in Port Harcourt, Nigeria.
      </div>
    </footer>
  );
}
