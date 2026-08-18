import { useEffect, useState } from "react";
import { DEFAULT_FOLD_STATE, getFoldState, onFoldStateChanged } from "../lib/foldState.js";
import type { FoldState } from "../lib/foldState.js";

/** Live Fold5 hinge state -- FLAT (or no fold at all, e.g. every other
 *  device/a plain browser) by default, updating in real time as the
 *  device is folded/unfolded/propped into flex mode. See lib/foldState.ts
 *  for why this needs a native bridge rather than just CSS. */
export function useFoldState(): FoldState {
  const [state, setState] = useState<FoldState>(DEFAULT_FOLD_STATE);

  useEffect(() => {
    let cancelled = false;
    getFoldState().then((s) => {
      if (!cancelled) setState(s);
    });
    const unsubscribe = onFoldStateChanged(setState);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}
