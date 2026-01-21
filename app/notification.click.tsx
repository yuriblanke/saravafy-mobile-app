import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useRouter } from "expo-router";

function parseNowPlayingTrackId(
  idRaw: unknown,
):
  | { kind: "approved"; pontoId: string }
  | { kind: "submission"; submissionId: string }
  | null {
  const id = typeof idRaw === "string" ? idRaw.trim() : "";
  if (!id) return null;

  if (id.startsWith("approved:")) {
    const pontoId = id.slice("approved:".length).trim();
    return pontoId ? { kind: "approved", pontoId } : null;
  }

  if (id.startsWith("submission:")) {
    const submissionId = id.slice("submission:".length).trim();
    return submissionId ? { kind: "submission", submissionId } : null;
  }

  return null;
}

export default function TrackPlayerNotificationClickRoute() {
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // TrackPlayer can be missing in some dev-client builds; avoid hard crash.
      let TrackPlayer: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        TrackPlayer = require("react-native-track-player").default;
      } catch {
        if (!cancelled) router.replace("/" as any);
        return;
      }

      try {
        const track = await TrackPlayer.getActiveTrack();
        const parsed = parseNowPlayingTrackId(track?.id);

        if (!parsed) {
          if (!cancelled) router.replace("/" as any);
          return;
        }

        if (parsed.kind === "approved") {
          if (!cancelled) {
            router.replace({
              pathname: "/player" as any,
              params: { source: "all", pontoId: parsed.pontoId },
            });
          }
          return;
        }

        if (!cancelled) {
          router.replace({
            pathname: "/review-submissions/[submissionId]" as any,
            params: { submissionId: parsed.submissionId },
          });
        }
      } catch {
        if (!cancelled) router.replace("/" as any);
      }
    };

    // Let the navigation tree mount first.
    const t = setTimeout(() => {
      run().catch(() => undefined);
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
