import { CATEGORIES } from "@/lib/data";

interface CategoriesBarProps {
  active: string;
  onSelect: (id: string) => void;
}

export default function CategoriesBar({ active, onSelect }: CategoriesBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {CATEGORIES.map((c) => (
        <button key={c.id} onClick={() => onSelect(c.id)}
          className={`flex min-w-[88px] shrink-0 items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
            active === c.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-white text-foreground hover:border-primary/35 hover:bg-secondary"
          }`}>
          <span className="text-base leading-none">{c.icon}</span>
          <span>{c.label}</span>
        </button>
      ))}
    </div>
  );
}
