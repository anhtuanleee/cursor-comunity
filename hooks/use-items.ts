"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryItem, GalleryPage } from "@/lib/types";

const PAGE_SIZE = 20;

function itemsApi(category: string | null, cursor: string | null) {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
  });
  if (category) params.set("category", category);
  if (cursor) params.set("cursor", cursor);
  return `/api/items?${params.toString()}`;
}

export function useItems(category: string | null, initialPage: GalleryPage) {
  const [items, setItems] = useState<GalleryItem[]>(initialPage.items);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage.nextCursor);
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(initialPage.nextCursor);
  const itemsRef = useRef<GalleryItem[]>(initialPage.items);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;

    setError(null);
    cursorRef.current = null;

    if (!category) {
      itemsRef.current = initialPage.items;
      setItems(initialPage.items);
      setNextCursor(initialPage.nextCursor);
      cursorRef.current = initialPage.nextCursor;
      setLoading(false);
      return () => controller.abort();
    }

    itemsRef.current = [];
    setItems([]);
    setNextCursor(null);
    setLoading(true);
    void fetch(itemsApi(category, null), { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<GalleryPage>;
      })
      .then(page => {
        if (requestId !== requestIdRef.current) return;
        itemsRef.current = page.items;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        cursorRef.current = page.nextCursor;
      })
      .catch(fetchError => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        if (requestId === requestIdRef.current) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch");
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });

    return () => controller.abort();
  }, [category, initialPage]);

  const loadMore = useCallback(async () => {
    const cursor = cursorRef.current;
    if (!cursor || loadingRef.current) return;

    const requestId = requestIdRef.current;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(itemsApi(category, cursor));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const page = await response.json() as GalleryPage;
      if (requestId !== requestIdRef.current) return;

      setItems(current => {
        const known = new Set(current.map(item => item.id));
        const nextItems = [
          ...current,
          ...page.items.filter(item => !known.has(item.id)),
        ];
        itemsRef.current = nextItems;
        return nextItems;
      });
      cursorRef.current = page.nextCursor;
      setNextCursor(page.nextCursor);
    } catch (fetchError) {
      if (requestId === requestIdRef.current) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch");
      }
    } finally {
      loadingRef.current = false;
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [category]);

  const loadUntil = useCallback(
    async (itemId: string) => {
      let waitAttempts = 0;
      while (!itemsRef.current.some(item => item.id === itemId)) {
        while (loadingRef.current && waitAttempts < 120) {
          await new Promise(resolve => window.setTimeout(resolve, 50));
          waitAttempts += 1;
        }
        if (!cursorRef.current || loadingRef.current) {
          return itemsRef.current.some(item => item.id === itemId);
        }
        await loadMore();
      }
      return true;
    },
    [loadMore],
  );

  return {
    items,
    loading,
    error,
    hasMore: Boolean(nextCursor),
    loadMore,
    loadUntil,
  };
}
