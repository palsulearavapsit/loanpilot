import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';

export function useHeartbeat(sessionId: string | null, currentStep: string, payload: any) {
  // Stable ref — avoids recreating the client on every render and keeps it
  // out of the effect dependency array (which would cause infinite re-fires)
  const supabaseRef = useRef(createClient());
  const lastUpdate = useRef<number>(0);

  useEffect(() => {
    // Skip if no session, or if it's a local/mock fallback (not a real DB row)
    if (!sessionId || sessionId.startsWith('local-')) return;

    const updateHeartbeat = async () => {
      const now = Date.now();
      // Throttling updates to once every 10 seconds to save on DB writes
      if (now - lastUpdate.current < 10000) return;

      try {
        const { error } = await supabaseRef.current.rpc('update_session_heartbeat', {
          session_id: sessionId,
          step: currentStep,
          data: payload,
          phone: payload?.phone_number || null
        });

        if (error) console.warn('Heartbeat update failed:', error);
        else lastUpdate.current = now;
      } catch (err) {
        console.warn('Heartbeat error:', err);
      }
    };

    updateHeartbeat();

    // Also update on cleanup (e.g. when component unmounts or step changes)
    return () => {
      updateHeartbeat();
    };
  }, [sessionId, currentStep, payload]);
}
