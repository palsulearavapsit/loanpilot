import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';

export function useHeartbeat(sessionId: string | null, currentStep: string, payload: any) {
  const supabase = createClient();
  const lastUpdate = useRef<number>(0);

  useEffect(() => {
    if (!sessionId) return;

    const updateHeartbeat = async () => {
      const now = Date.now();
      // Throttling updates to once every 10 seconds to save on DB writes
      if (now - lastUpdate.current < 10000) return;

      try {
        const { error } = await supabase.rpc('update_session_heartbeat', {
          session_id: sessionId,
          step: currentStep,
          data: payload
        });

        if (error) console.error('Heartbeat update failed:', error);
        else lastUpdate.current = now;
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    };

    updateHeartbeat();

    // Also update on cleanup (e.g. when component unmounts or step changes)
    return () => {
      updateHeartbeat();
    };
  }, [sessionId, currentStep, payload, supabase]);
}
