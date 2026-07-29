"use client";

import {
  startTransition,
  useCallback,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addTransitionType } from "@/lib/view-transition";

interface DetailLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children?: ReactNode;
}

export function DetailLink({
  href,
  children,
  onClick,
  onMouseEnter,
  onFocus,
  ...props
}: DetailLinkProps) {
  const router = useRouter();
  const prefetchDetail = useCallback(() => {
    router.prefetch(href);
  }, [href, router]);

  return (
    <Link
      {...props}
      href={href}
      prefetch
      scroll={false}
      onMouseEnter={event => {
        onMouseEnter?.(event);
        if (!event.defaultPrevented) prefetchDetail();
      }}
      onFocus={event => {
        onFocus?.(event);
        if (!event.defaultPrevented) prefetchDetail();
      }}
      onClick={event => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        startTransition(() => {
          addTransitionType("detail-open");
          router.push(href, { scroll: false });
        });
      }}
    >
      {children}
    </Link>
  );
}
