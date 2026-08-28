import { useCallback } from 'react';

/**
 * Hook for playing responsive Web Audio API sound effects without external audio files.
 */
export function useSound() {
  const playBeep = useCallback((frequency: number = 880, durationMs: number = 70, type: OscillatorType = 'sine') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Ignore audio synthesis errors on autoplay restrictions
    }
  }, []);

  const playSuccess = useCallback(() => {
    playBeep(987, 80, 'sine');
    setTimeout(() => playBeep(1318, 120, 'sine'), 90);
  }, [playBeep]);

  const playError = useCallback(() => {
    playBeep(220, 160, 'sawtooth');
    setTimeout(() => playBeep(180, 200, 'sawtooth'), 180);
  }, [playBeep]);

  const playCashPayment = useCallback(() => {
    playBeep(659, 70, 'triangle');
    setTimeout(() => playBeep(880, 80, 'triangle'), 80);
    setTimeout(() => playBeep(1174, 150, 'triangle'), 160);
  }, [playBeep]);

  const playBarcodeScan = useCallback(() => {
    playBeep(1400, 60, 'sine');
  }, [playBeep]);

  return {
    playBeep,
    playSuccess,
    playError,
    playCashPayment,
    playBarcodeScan,
  };
}
