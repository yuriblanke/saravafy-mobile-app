import React, { useEffect } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import Preferences from "@/src/screens/Preferences/Preferences";
import { navTrace } from "@/src/utils/navTrace";

export default function PreferencesRoute() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    navTrace("Route /(app)/preferences mount");
    return () => navTrace("Route /(app)/preferences unmount");
  }, []);

  useEffect(() => {
    if (!__DEV__) return;

    navTrace("Route /(app)/preferences attach transition listeners");

    const subs = [
      navigation.addListener("transitionStart", (e: any) => {
        navTrace("Route /(app)/preferences transitionStart", e?.data);
      }),
      navigation.addListener("transitionEnd", (e: any) => {
        navTrace("Route /(app)/preferences transitionEnd", e?.data);
      }),
      navigation.addListener("beforeRemove", (e: any) => {
        navTrace("Route /(app)/preferences beforeRemove", e?.data);
      }),
    ];

    return () => {
      for (const sub of subs) sub?.();
    };
  }, [navigation]);

  useFocusEffect(
    React.useCallback(() => {
      navTrace("Route /(app)/preferences focus");
      return () => navTrace("Route /(app)/preferences blur");
    }, [])
  );

  return <Preferences />;
}
