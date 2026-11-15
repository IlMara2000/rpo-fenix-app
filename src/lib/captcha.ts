/**
 * Captcha anti-bot di Supabase (Cloudflare Turnstile oppure hCaptcha).
 *
 * Le chiavi vivono solo nelle variabili d'ambiente:
 * - `VITE_SUPABASE_CAPTCHA_SITE_KEY`: chiave pubblica del sito, finisce nel bundle
 *   ed è normale che sia visibile;
 * - `VITE_SUPABASE_CAPTCHA_PROVIDER`: `turnstile` oppure `hcaptcha`.
 *
 * La chiave segreta non passa mai dal browser: si configura nel progetto Supabase,
 * che verifica il gettone prima di accettare l'accesso. Se le variabili mancano il
 * modulo resta spento e l'accesso funziona come prima.
 */

export type CaptchaProvider = "turnstile" | "hcaptcha";

type CaptchaApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: CaptchaApi;
    hcaptcha?: CaptchaApi;
  }
}

const providerValue = String(import.meta.env.VITE_SUPABASE_CAPTCHA_PROVIDER ?? "")
  .trim()
  .toLowerCase();
const siteKeyValue = String(import.meta.env.VITE_SUPABASE_CAPTCHA_SITE_KEY ?? "").trim();

export const captchaProvider: CaptchaProvider | null =
  siteKeyValue && (providerValue === "turnstile" || providerValue === "hcaptcha")
    ? (providerValue as CaptchaProvider)
    : null;

export const isCaptchaEnabled = captchaProvider !== null;

const scriptSources: Record<CaptchaProvider, string> = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  hcaptcha: "https://js.hcaptcha.com/1/api.js?render=explicit",
};

let scriptLoader: Promise<void> | null = null;

function captureApi(provider: CaptchaProvider): CaptchaApi | undefined {
  return provider === "turnstile" ? window.turnstile : window.hcaptcha;
}

function loadProviderScript(provider: CaptchaProvider): Promise<void> {
  if (captureApi(provider)) return Promise.resolve();
  if (scriptLoader) return scriptLoader;

  scriptLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptSources[provider];
    script.async = true;
    script.defer = true;
    script.dataset.fenixCaptcha = provider;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        scriptLoader = null;
        script.remove();
        reject(new Error("captcha-script"));
      },
      { once: true },
    );
    document.head.append(script);
  });

  return scriptLoader;
}

/**
 * Disegna il widget una sola volta nel contenitore indicato.
 * Chiamato più volte (React in modalità strict monta due volte) non duplica il widget.
 */
export function mountCaptcha(
  container: HTMLElement,
  onToken: (token: string | null) => void,
): void {
  const provider = captchaProvider;
  if (!provider) return;
  if (container.dataset.captchaMounted === "1") return;
  container.dataset.captchaMounted = "1";

  void loadProviderScript(provider)
    .then(() => {
      const api = captureApi(provider);
      if (!api) throw new Error("captcha-api");
      const widgetId = api.render(container, {
        sitekey: siteKeyValue,
        theme: "dark",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
      container.dataset.captchaWidgetId = widgetId;
    })
    .catch(() => {
      // Widget non disponibile: l'accesso resta possibile, il server deciderà.
      delete container.dataset.captchaMounted;
      onToken(null);
    });
}

/** Azzera il gettone dopo un tentativo fallito, così il widget torna utilizzabile. */
export function resetCaptcha(container: HTMLElement | null): void {
  if (!container) return;
  const provider = captchaProvider;
  if (!provider) return;
  const widgetId = container.dataset.captchaWidgetId;
  const api = captureApi(provider);
  if (!api || !widgetId) return;
  try {
    api.reset(widgetId);
  } catch {
    // Se il reset non riesce il widget successivo viene ridisegnato al prossimo accesso.
  }
}
