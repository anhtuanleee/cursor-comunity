"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type UserIdentity, createUser, getOrCreateUserId } from "@/lib/user";

interface UserContextType { user: UserIdentity | null; isReady: boolean; }

const UserContext = createContext<UserContextType>({ user: null, isReady: false });

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const id = getOrCreateUserId();
    const identity = createUser();
    setUser({ id, name: identity.name, color: identity.color });
    setIsReady(true);
  }, []);

  return <UserContext.Provider value={{ user, isReady }}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextType { return useContext(UserContext); }
