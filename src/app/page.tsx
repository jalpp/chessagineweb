"use client";
import { usePageReady } from "@/hooks/usePageReady";

import HomeView from "@/componets/view/HomeView";

export default function HomePage() {
  usePageReady();
  return <HomeView/>
}