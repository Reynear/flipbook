"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

let convexClient: ConvexReactClient | null = null;

function getConvexClient() {
  if (typeof window === "undefined") return null;
  if (!convexClient) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) return null;
    convexClient = new ConvexReactClient(url);
  }
  return convexClient;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = getConvexClient();
  if (!client) {
    return <>{children}</>;
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
