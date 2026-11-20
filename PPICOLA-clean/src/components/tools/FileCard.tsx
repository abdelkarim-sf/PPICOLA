"use client";

import { motion } from "framer-motion";
import { useT } from "@/i18n";

type Props = {
  thumbUrl?: string;
  emoji?: string;
  title: string;
  subtitle?: string;
  index?: number;
  onRemove?: () => void;
  onEdit?: () => void;
  editLabel?: string;
  selected?: boolean;
  renderThumb?: () => React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
};

/** Thumbnail card used in the sortable grids of the tools. */
export default function FileCard({
  thumbUrl,
  emoji = "📄",
  title,
  subtitle,
  index,
  onRemove,
  onEdit,
  editLabel = "Edit",
  selected,
  onClick,
  children,
  className = "",
  renderThumb,
}: Props) {
  const { t } = useT();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border bg-white dark:bg-white/[0.05] shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift ${
        selected ? "border-brand-400 ring-4 ring-brand-400/20" : "border-black/[0.05] dark:border-white/10"
      } ${onClick ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} ${className}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-white/5">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt={title} className="h-full w-full object-cover" draggable={false} />
        ) : renderThumb ? (
          renderThumb()
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">{emoji}</div>
        )}
        {index !== undefined && (
          <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-black/55 px-1.5 text-[11px] font-bold text-white backdrop-blur">
            {index + 1}
          </span>
        )}
        {selected && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs text-white shadow-lift">
            ✓
          </span>
        )}
      </div>

      <div className="space-y-1.5 p-3">
        <p className="truncate text-xs font-semibold" title={title}>
          {title}
        </p>
        {subtitle && <p className="truncate text-[11px] text-gray-400 dark:text-gray-500">{subtitle}</p>}
        {children}
      </div>

      {(onRemove || onEdit) && (
        <div className="flex items-center gap-1.5 px-3 pb-3">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex-1 rounded-xl bg-brand-50 dark:bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-brand-600 dark:text-brand-300 transition-colors hover:bg-brand-100 dark:hover:bg-white/15"
            >
              {editLabel}
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              aria-label={t("shared.remove", { name: title })}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/15 text-[11px] font-bold text-rose-500 transition-colors hover:bg-rose-100 dark:hover:bg-rose-500/30"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
