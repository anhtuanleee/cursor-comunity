"use client";

import Link from "next/link";

const FILTERS = [
  { slug: null, label: "All" },
  { slug: "web", label: "Web" },
  { slug: "interface", label: "Interface" },
  { slug: "branding", label: "Branding" },
  { slug: "product", label: "Product" },
  { slug: "print", label: "Print" },
  { slug: "typography", label: "Typography" },
  { slug: "motion", label: "Motion" },
  { slug: "illustration", label: "Illustration" },
  { slug: "3d", label: "3D" },
];

interface HeaderProps {
  activeCategory: string | null;
  onCategoryChange: (slug: string | null) => void;
  onlineCount?: number;
}

export function Header({ activeCategory, onCategoryChange, onlineCount = 0 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-border-divider flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-8 min-w-0">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-[10px] font-medium">C</span>
          </div>
          <span className="text-h1 text-text-primary hidden sm:block">Cursor Community</span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f.slug || "all"}
              onClick={() => onCategoryChange(f.slug)}
              className={`whitespace-nowrap px-3 py-2 text-body font-normal transition-colors duration-150 border-b-2 ${
                activeCategory === f.slug
                  ? "text-black font-medium border-black"
                  : "text-text-secondary border-transparent hover:text-black hover:border-[#CCCCCC]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </nav>
      </div>

      {onlineCount > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex -space-x-2">
            {Array.from({ length: Math.min(onlineCount, 3) }).map((_, i) => (
              <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-bg-tertiary flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-[#059669]" />
              </div>
            ))}
          </div>
          <span className="text-body text-text-secondary hidden sm:inline">{onlineCount} online</span>
        </div>
      )}
    </header>
  );
}
