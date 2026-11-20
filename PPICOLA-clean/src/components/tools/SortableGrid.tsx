"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function SortableItem({
  id,
  children,
  className = "",
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`${className} ${isDragging ? "z-20 opacity-80 scale-[1.02]" : ""} touch-pan-y`}
    >
      {children}
    </div>
  );
}

/** Drag & drop reorderable grid (dnd-kit). */
export default function SortableGrid({
  items,
  idOf,
  onReorder,
  renderItem,
  className = "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4",
  itemClassName = "",
}: {
  items: unknown[];
  idOf: (item: never, index: number) => string;
  onReorder: (items: never[]) => void;
  renderItem: (item: never, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((_, i) => idOf(items[i] as never, i) === active.id);
    const newIndex = items.findIndex((_, i) => idOf(items[i] as never, i) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items as never[], oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((it, i) => idOf(it as never, i))} strategy={rectSortingStrategy}>
        <div className={className}>
          {items.map((it, i) => (
            <SortableItem key={idOf(it as never, i)} id={idOf(it as never, i)} className={itemClassName}>
              {renderItem(it as never, i)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
