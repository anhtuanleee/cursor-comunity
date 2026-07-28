"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BoardIcon, CloseIcon } from "@/components/ui/icons";
import type {
  BoardEntry,
  BoardLane,
  BoardMutation,
} from "@/lib/types";

const LANES: Array<{ id: BoardLane; label: string }> = [
  { id: "keep", label: "Keep" },
  { id: "maybe", label: "Maybe" },
  { id: "reject", label: "Reject" },
];

export function ShortlistBoard({
  open,
  latestMutation,
  optimisticEntries,
  onClose,
  onMove,
}: {
  open: boolean;
  latestMutation: BoardMutation | null;
  optimisticEntries: BoardEntry[];
  onClose: () => void;
  onMove: (itemId: string, lane: BoardLane, reason: string) => Promise<unknown>;
}) {
  const [items, setItems] = useState<BoardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const visibleItems = useMemo(() => {
    const byItemId = new Map(items.map(item => [item.itemId, item]));
    for (const entry of optimisticEntries) {
      if (!byItemId.has(entry.itemId)) byItemId.set(entry.itemId, entry);
    }
    return [...byItemId.values()];
  }, [items, optimisticEntries]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/board");
      if (!response.ok) return;
      const payload = (await response.json()) as { items: BoardEntry[] };
      setItems(payload.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [latestMutation, load, open]);

  const move = useCallback(
    async (entry: BoardEntry, lane: BoardLane, reason = entry.reason) => {
      setItems(current =>
        current.map(item =>
          item.itemId === entry.itemId
            ? { ...item, lane, reason, updatedAt: Date.now() }
            : item,
        ),
      );
      try {
        await onMove(entry.itemId, lane, reason);
      } catch {
        await load();
      }
    },
    [load, onMove],
  );

  return (
    <>
      <button
        type="button"
        aria-label="Close shortlist"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(25rem,calc(100vw-1rem))] flex-col border-l border-border-divider bg-white shadow-modal transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex h-14 flex-none items-center justify-between border-b border-border-divider px-4">
          <div className="flex items-center gap-2">
            <BoardIcon size="1rem" />
            <div>
              <h2 className="text-h2 text-primary">Community shortlist</h2>
              <p className="text-caption text-text-secondary">
                Keep, question, or reject together
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortlist"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg-secondary"
          >
            <CloseIcon size="1rem" />
          </button>
        </header>

        <div data-lenis-prevent className="scrollbar-none flex-1 overflow-y-auto p-3">
          {loading && items.length === 0 ? (
            <p className="py-8 text-center text-body text-text-secondary">
              Loading shortlist…
            </p>
          ) : null}
          <div className="grid gap-3">
            {LANES.map(lane => {
              const laneItems = visibleItems.filter(item => item.lane === lane.id);
              return (
                <section
                  key={lane.id}
                  className="rounded-card bg-bg-secondary p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-button font-medium uppercase tracking-[0.03125rem]">
                      {lane.label}
                    </h3>
                    <span className="text-caption text-text-secondary">
                      {laneItems.length}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {laneItems.map(entry => (
                      <article
                        key={entry.itemId}
                        className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 rounded-modal border border-border-divider bg-white p-2"
                      >
                        <img
                          src={entry.coverUrl}
                          alt=""
                          className="h-14 w-14 rounded-badge bg-bg-tertiary object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-button font-medium">
                            {entry.title}
                          </p>
                          <div className="mt-1 flex gap-1">
                            {LANES.filter(option => option.id !== lane.id).map(
                              option => (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => void move(entry, option.id)}
                                  className="rounded-btn bg-bg-tertiary px-2 py-1 text-caption text-text-secondary hover:text-black"
                                >
                                  {option.label}
                                </button>
                              ),
                            )}
                          </div>
                          <input
                            key={`${entry.itemId}-${entry.updatedAt}`}
                            defaultValue={entry.reason}
                            maxLength={280}
                            placeholder="Decision reason"
                            onBlur={event => {
                              const reason = event.currentTarget.value.trim();
                              if (reason !== entry.reason) {
                                void move(entry, entry.lane, reason);
                              }
                            }}
                            className="mt-2 h-8 w-full rounded-input border border-border-divider bg-white px-2 text-caption outline-none focus:border-black focus:ring-[0.1875rem] focus:ring-black/5"
                          />
                        </div>
                      </article>
                    ))}
                    {laneItems.length === 0 ? (
                      <p className="rounded-modal border border-dashed border-border-light py-4 text-center text-caption text-text-secondary">
                        No references yet
                      </p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
