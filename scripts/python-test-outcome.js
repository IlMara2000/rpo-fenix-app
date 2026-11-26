/**
 * Decisione finale di `npm run test:py`, separata dal processo che lancia Python
 * per poterla provare senza eseguire niente.
 *
 * Serve perché un ResourceWarning può nascere nel `__del__` di una risorsa
 * abbandonata e restare nel testo del run senza far fallire unittest: qui è
 * trattato come errore anche quando lo status è 0. Un fallimento vero mantiene
 * la precedenza, perché il suo codice di uscita è più informativo.
 */
export function decideOutcome({ status, stdout = "", stderr = "" }) {
  const warningCount = (stdout + stderr).match(/ResourceWarning/g)?.length ?? 0;
  if (status !== 0) {
    return { exitCode: status, warningCount, message: "" };
  }
  if (warningCount > 0) {
    return {
      exitCode: 1,
      warningCount,
      message: [
        `Test Python falliti: ${warningCount} ResourceWarning.`,
        "Una risorsa non è stata chiusa: chiudila dove la apri, non filtrare l'avviso.",
      ].join("\n"),
    };
  }
  return { exitCode: 0, warningCount: 0, message: "" };
}
