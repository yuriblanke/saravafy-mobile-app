import React from "react";

export type NavCoverState = {
  visible: boolean;
  backgroundColor?: string;
  reason?: string;
  token?: string;
  ready?: boolean;
};

type NavCoverListener = () => void;

const listeners = new Set<NavCoverListener>();
let state: NavCoverState = { visible: false, ready: false };

function newToken() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getNavCoverState(): NavCoverState {
  return state;
}

export function setNavCoverState(next: NavCoverState) {
  state = next;
  for (const l of Array.from(listeners)) l();
}

export function showNavCover(options?: {
  backgroundColor?: string;
  reason?: string;
}) {
  const token = newToken();
  setNavCoverState({
    visible: true,
    ready: false,
    token,
    backgroundColor: options?.backgroundColor,
    reason: options?.reason,
  });
  return token;
}

export function markNavCoverReady(token: string) {
  if (!token) return;
  if (state.token !== token) return;
  if (!state.visible) return;
  if (state.ready) return;
  setNavCoverState({
    ...state,
    ready: true,
  });
}

export function setNavCoverVisible(
  visible: boolean,
  options?: { backgroundColor?: string; reason?: string }
) {
  if (!visible) {
    setNavCoverState({
      ...state,
      ...options,
      visible: false,
      ready: false,
      token: undefined,
    });
    return;
  }

  // Ao (re)mostrar, cria um token novo e marca como não-pronto.
  setNavCoverState({
    ...state,
    ...options,
    visible: true,
    ready: false,
    token: newToken(),
  });
}

export function subscribeNavCover(listener: NavCoverListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNavCoverState(): NavCoverState {
  return React.useSyncExternalStore(subscribeNavCover, getNavCoverState);
}
