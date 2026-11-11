"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Shell } from "./Shell";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  return <Shell>{children}</Shell>;
}
