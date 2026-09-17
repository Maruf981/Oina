"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Корзина теперь в выезжающей панели — старый адрес /cart открывает её на главной
export default function CartPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/?bag=1");
  }, [router]);
  return null;
}
