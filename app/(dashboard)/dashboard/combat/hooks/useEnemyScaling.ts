"use client";

import { useState, useEffect, useRef } from "react";

const DEBOUNCE_MS = 1500;

export interface EnemyScaling {
  /** The committed level used for all loot/stat calculations. */
  scaledLevel: number;
  /** The live slider value — updates on every drag tick. */
  pendingLevel: number;
  /** True while the slider has moved but the debounce hasn't fired yet. */
  isCalculating: boolean;
  /** True when scaledLevel differs from the character's combat level (i.e. scaling is active). */
  isScaling: boolean;
  /** Update the pending level; commits to scaledLevel after 1.5s of inactivity. */
  setLevel: (n: number) => void;
  /** Immediately reset both pendingLevel and scaledLevel to the character's combat level. */
  reset: () => void;
}

/**
 * Manages enemy scaling state with a debounced commit.
 *
 * - Moving the slider updates pendingLevel immediately (for the label)
 * - scaledLevel (used for calculations) commits 1.5s after the last move
 * - Switching characters resets both levels immediately
 * - Below L80, scaling is not available in-game; the caller is responsible for disabling the slider
 */
export function useEnemyScaling(charCombatLevel: number | null): EnemyScaling {
  const defaultLevel = charCombatLevel ?? 1;
  const defaultLevelRef = useRef(defaultLevel);
  defaultLevelRef.current = defaultLevel; // keep in sync on every render

  const [pendingLevel, setPendingLevel] = useState(defaultLevel);
  const [scaledLevel, setScaledLevel] = useState(defaultLevel);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when the character changes
  useEffect(() => {
    if (charCombatLevel === null) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPendingLevel(charCombatLevel);
    setScaledLevel(charCombatLevel);
  }, [charCombatLevel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function setLevel(n: number) {
    setPendingLevel(n);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setScaledLevel(n);
    }, DEBOUNCE_MS);
  }

  function reset() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPendingLevel(defaultLevelRef.current);
    setScaledLevel(defaultLevelRef.current);
  }

  return {
    scaledLevel,
    pendingLevel,
    isCalculating: pendingLevel !== scaledLevel,
    isScaling: scaledLevel !== defaultLevel,
    setLevel,
    reset,
  };
}
