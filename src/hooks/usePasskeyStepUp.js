import { useCallback, useEffect, useRef } from "react";
import { passkeyStepUp, preparePasskeyStepUp } from "../utils/passkey";

/* ------------------------------------------------------------------ */
/* Passkey step-up with options fetched before the click (Safari only  */
/* shows the prompt when it opens straight from a user gesture).       */
/* ------------------------------------------------------------------ */
export default function usePasskeyStepUp(enabled) {
  const prep = useRef(null);
  const load = useCallback(() => {
    prep.current = preparePasskeyStepUp().catch(() => null);
  }, []);

  useEffect(() => {
    if (enabled) load();
    else prep.current = null;
  }, [enabled, load]);

  return useCallback(async () => {
    const pending = prep.current;
    prep.current = null; // single-use challenge
    const ready = pending ? await pending : null;
    try {
      return await passkeyStepUp(ready);
    } finally {
      if (enabled) load(); // have a fresh one ready for a retry
    }
  }, [enabled, load]);
}