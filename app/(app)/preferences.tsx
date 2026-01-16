import React, { useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";

import Preferences from "@/src/screens/Preferences/Preferences";
import { navTrace } from "@/src/utils/navTrace";

export default function PreferencesRoute() {
  useEffect(() => {
    navTrace("Route /(app)/preferences mount");
    return () => navTrace("Route /(app)/preferences unmount");
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      navTrace("Route /(app)/preferences focus");
      return () => navTrace("Route /(app)/preferences blur");
    }, [])
  );

  return <Preferences />;
}
