import { useState } from "react";

type GlassColor = "All" | "Brown" | "White" | "Green";

const filters: GlassColor[] = [
  "All",
  "Brown",
  "White",
  "Green",
];

export default function GlassFilters() {
  const [selected, setSelected] = useState<GlassColor>("All");

  return (
    <div className="glass-filters">
      <div className="glass-filter-buttons">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`glass-filter ${
              selected === filter ? "glass-filter-active" : ""
            }`}
            onClick={() => setSelected(filter)}
            aria-pressed={selected === filter}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}