import React from "react";

export type NavCoverState = {
  visible: boolean;
  backgroundColor?: string;
  reason?: string;
};

type NavCoverListener = () => void;

const listeners = new Set<NavCoverListener>();
let state: NavCoverState = { visible: false };

export function getNavCoverState(): NavCoverState {
  return state;
}

export function setNavCoverState(next: NavCoverState) {
  state = next;
  for (const l of Array.from(listeners)) l();
}

export function setNavCoverVisible(
  visible: boolean,
  options?: { backgroundColor?: string; reason?: string }
) {
  setNavCoverState({
    ...state,
    ...options,
    visible,
  });
}

export function subscribeNavCover(listener: NavCoverListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNavCoverState(): NavCoverState {
  return React.useSyncExternalStore(subscribeNavCover, getNavCoverState);
}
