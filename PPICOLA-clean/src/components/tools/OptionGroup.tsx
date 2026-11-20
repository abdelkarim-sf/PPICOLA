"use client";

export type OptionChoice<T extends string> = { value: T; label: string };

/** Chip-style option group used across all tool option panels. */
export default function OptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  cols = 3,
}: {
  label: string;
  value: T;
  options: OptionChoice<T>[];
  onChange: (v: T) => void;
  cols?: 2 | 3 | 4;
}) {
  const gridCols = cols === 4 ? "grid-cols-4" : cols === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      <div className={`grid ${gridCols} gap-2`} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-xl px-2 py-2.5 text-xs font-bold transition-all ${
              value === o.value
                ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lift"
                : "bg-brand-50/60 dark:bg-white/[0.06] text-brand-700 dark:text-brand-200 hover:bg-brand-100 dark:hover:bg-white/10"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
