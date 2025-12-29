import { useRouter } from "expo-router";
import { useEffect } from "react";

import { useRootPager } from "@/contexts/RootPagerContext";

export default function TerreirosRedirect() {
  const router = useRouter();
  const rootPager = useRootPager();

  useEffect(() => {
    rootPager.setActiveKey("terreiros");
    router.replace("/");
  }, [rootPager, router]);

  return null;
}
