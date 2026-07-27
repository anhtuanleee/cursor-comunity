"use client";

import { ReactNode } from "react";
import { UserProvider } from "./user-provider";
import { SocketProvider } from "./socket-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </UserProvider>
  );
}
