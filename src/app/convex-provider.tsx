"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
let convexClient: ConvexReactClient | undefined;

function getConvexClient(): ConvexReactClient {
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL must be set.");
  }
  if (!convexClient) {
    convexClient = new ConvexReactClient(convexUrl);
  }
  return convexClient;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = getConvexClient();
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
