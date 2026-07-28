"use client";

import { ReactNode } from "react";
import { UserProvider } from "./user-provider";
import { SocketProvider } from "./socket-provider";
import { SmoothScrollProvider } from "./smooth-scroll-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <SocketProvider>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </SocketProvider>
    </UserProvider>
  );
}
