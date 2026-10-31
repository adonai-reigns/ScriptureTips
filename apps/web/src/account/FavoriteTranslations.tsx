"use client";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

interface Option {
  id: string;
  label: string;
}

type Group = "favorites" | "others";

/**
 * The public translations (the ones that can be a base) in two sortable groups: favorites on top,
 * the rest under them. A row is dragged by its handle (mouse, touch, or the keyboard: Space picks
 * it up, the arrows move it, Space drops it) between and within the groups, or sent to the other
 * group by its star. The order is posted with the form as repeated `favorite` and `other` fields.
 */
export function FavoriteTranslations({
  options,
  favorites,
  favoritesOnly,
}: {
  /** Every public translation: the favorites first in their order, then the rest in theirs. */
  options: readonly Option[];
  /** The IDs among them that are favorites. */
  favorites: readonly string[];
  favoritesOnly: boolean;
}) {
  const t = useTranslations("account");
  const label = new Map(options.map((o) => [o.id, o.label]));
  const [lists, setLists] = useState<Record<Group, string[]>>({
    favorites: options.map((o) => o.id).filter((id) => favorites.includes(id)),
    others: options.map((o) => o.id).filter((id) => !favorites.includes(id)),
  });
  const [only, setOnly] = useState(favoritesOnly);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const groupOf = (id: string, from = lists): Group | null =>
    id === GROUP.favorites
      ? "favorites"
      : id === GROUP.others
        ? "others"
        : from.favorites.includes(id)
          ? "favorites"
          : from.others.includes(id)
            ? "others"
            : null;

  /** Carries a row into the group it is over, as it is dragged. */
  const over = (e: DragOverEvent) => {
    const active = String(e.active.id);
    const target = e.over ? String(e.over.id) : null;
    if (!target) return;
    setLists((prev) => {
      const from = groupOf(active, prev);
      const to = groupOf(target, prev);
      if (!from || !to || from === to) return prev;
      const into = [...prev[to]];
      const at = into.indexOf(target);
      into.splice(at >= 0 ? at : into.length, 0, active);
      return { ...prev, [from]: prev[from].filter((id) => id !== active), [to]: into };
    });
  };

  const end = (e: DragEndEvent) => {
    const active = String(e.active.id);
    const target = e.over ? String(e.over.id) : null;
    if (!target || active === target) return;
    setLists((prev) => {
      const group = groupOf(active, prev);
      if (!group || group !== groupOf(target, prev)) return prev;
      const from = prev[group].indexOf(active);
      const to = prev[group].indexOf(target);
      return to < 0 ? prev : { ...prev, [group]: arrayMove(prev[group], from, to) };
    });
  };

  const star = (id: string) =>
    setLists((prev) => {
      const from = groupOf(id, prev);
      if (!from) return prev;
      const to: Group = from === "favorites" ? "others" : "favorites";
      return {
        ...prev,
        [from]: prev[from].filter((x) => x !== id),
        [to]: [...prev[to], id],
      };
    });

  return (
    <fieldset className="account-pair favorite-translations">
      <legend>{t("listTitle")}</legend>
      <p className="account-row-help">{t("listHelp")}</p>
      <DndContext
        id={useId()}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragOver={over}
        onDragEnd={end}
      >
        <div className="favorite-groups">
          {(["favorites", "others"] as const).map((group) => (
            <GroupList
              key={group}
              group={group}
              title={t(group === "favorites" ? "groupTop" : "groupRest")}
              empty={t(group === "favorites" ? "emptyTop" : "emptyRest")}
              ids={lists[group]}
              labelOf={(id) => label.get(id) ?? id}
              onStar={star}
            />
          ))}
        </div>
      </DndContext>
      {lists.favorites.map((id) => (
        <input key={id} type="hidden" name="favorite" value={id} />
      ))}
      {lists.others.map((id) => (
        <input key={id} type="hidden" name="other" value={id} />
      ))}
      <label className="favorites-only">
        <input
          type="checkbox"
          name="favoritesOnly"
          checked={only}
          onChange={(e) => setOnly(e.target.checked)}
        />
        <span>
          {t("onlyTop")} <small>{t("onlyTopHelp")}</small>
        </span>
      </label>
    </fieldset>
  );
}

/** Droppable ids that can't be a translation's catalog ID (those have no colon). */
const GROUP = { favorites: "group:favorites", others: "group:others" } as const;

function GroupList({
  group,
  title,
  empty,
  ids,
  labelOf,
  onStar,
}: {
  group: Group;
  title: string;
  empty: string;
  ids: string[];
  labelOf: (id: string) => string;
  onStar: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: GROUP[group] });
  return (
    <section className={`favorite-group${isOver ? " over" : ""}`} aria-label={title}>
      <h3>{title}</h3>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef}>
          {ids.map((id) => (
            <Row
              key={id}
              id={id}
              label={labelOf(id)}
              starred={group === "favorites"}
              onStar={onStar}
            />
          ))}
          {ids.length === 0 ? <li className="favorite-empty">{empty}</li> : null}
        </ul>
      </SortableContext>
    </section>
  );
}

function Row({
  id,
  label,
  starred,
  onStar,
}: {
  id: string;
  label: string;
  starred: boolean;
  onStar: (id: string) => void;
}) {
  const t = useTranslations("account");
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      className={`favorite-row${isDragging ? " dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="favorite-handle"
        aria-label={t("rowMove", { name: label })}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⠿</span>
      </button>
      <span className="favorite-name">{label}</span>
      <button
        type="button"
        className={`favorite-star${starred ? " on" : ""}`}
        aria-pressed={starred}
        aria-label={t(starred ? "rowRemove" : "rowAdd", { name: label })}
        onClick={() => onStar(id)}
      >
        <span aria-hidden="true">{starred ? "★" : "☆"}</span>
      </button>
    </li>
  );
}
