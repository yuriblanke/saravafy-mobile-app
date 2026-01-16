import React, { useEffect } from "react";

import Preferences from "@/src/screens/Preferences/Preferences";
import { navTrace } from "@/src/utils/navTrace";

export default function PreferencesRoute() {
  useEffect(() => {
    navTrace("Route /(app)/preferences mount");
    return () => navTrace("Route /(app)/preferences unmount");
  }, []);

  return <Preferences />;
}
