"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    router.replace(isAuthenticated() ? "/overview" : "/login");
  }, [router]);
  return null;
}
