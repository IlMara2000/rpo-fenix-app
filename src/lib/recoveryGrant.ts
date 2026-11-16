/** Quanto dura il permesso concesso dal link di recupero: un quarto d'ora. */
export const recoveryGrantMs = 15 * 60 * 1000;

/**
 * Il permesso vale solo tra il momento in cui il client ha annunciato il recupero e la
 * scadenza. Alla scadenza esatta conta già come scaduto, e senza permesso (`null`) la
 * password attuale torna obbligatoria: in entrambi i casi l'errore cade dalla parte sicura.
 */
export function isRecoveryGrantActive(until: number | null, now: number): boolean {
  return until !== null && now < until;
}
