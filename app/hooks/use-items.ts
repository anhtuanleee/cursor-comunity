"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryItem } from "@/lib/types";

const PAGE_SIZE = 20;

function itemsApi(category: string | null, offset = 0) {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  if (category) params.set("category", category);
  return `/api/items?${params.toString()}`;
}

export function useItems(category: string | null) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;

    setItems([]);
    setHasMore(true);
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(itemsApi(category), { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { items?: GalleryItem[] };
        const nextItems: GalleryItem[] = data.items || [];
        if (requestId === requestIdRef.current) {
          setItems(nextItems);
          setHasMore(nextItems.length === PAGE_SIZE);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : "Failed to fetch");
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [category]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const requestId = requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(itemsApi(category, items.length));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { items?: GalleryItem[] };
      const nextItems: GalleryItem[] = data.items || [];
      if (requestId !== requestIdRef.current) return;
      setItems(current => {
        const known = new Set(current.map(item => item.id));
        return [...current, ...nextItems.filter(item => !known.has(item.id))];
      });
      setHasMore(nextItems.length === PAGE_SIZE);
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [category, hasMore, items.length, loading]);

  return { items, loading, error, hasMore, loadMore };
}
