"use client";

import { startTransition, type AnchorHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addTransitionType } from "@/lib/view-transition";

interface DetailLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children?: ReactNode;
}

export function DetailLink({ href, children, onClick, ...props }: DetailLinkProps) {
  const router = useRouter();

  return (
    <Link
      {...props}
      href={href}
      scroll={false}
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
