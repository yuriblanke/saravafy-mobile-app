import { useRouter } from "expo-router";
import { useEffect } from "react";

import { useRootPager } from "@/contexts/RootPagerContext";

export default function HomeRedirect() {
  const router = useRouter();
  const rootPager = useRootPager();

  useEffect(() => {
    rootPager.setActiveKey("pontos");
    router.replace("/");
  }, [rootPager, router]);

  return null;
}
