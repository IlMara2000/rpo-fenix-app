"""Verifica dell'identità per le funzioni Python di Vercel.

Rispecchia la politica di server/security.js: token Supabase valido e profilo
con status "Attivo". In assenza di configurazione l'accesso è negato.
"""
import json
import os
import urllib.error
import urllib.request
from urllib.parse import quote

TIMEOUT = 8


class AuthError(Exception):
    def __init__(self, message, status_code):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _settings():
    url = (
        os.environ.get("SUPABASE_URL")
        or os.environ.get("VITE_SUPABASE_URL")
        or ""
    ).rstrip("/")
    key = (
        os.environ.get("SUPABASE_PUBLISHABLE_KEY")
        or os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")
        or ""
    ).strip()
    return url, key


def _get_json(url, token, key):
    request = urllib.request.Request(
        url,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8") or "null")


def _bearer_token(headers):
    raw = headers.get("authorization") or headers.get("Authorization") or ""
    scheme, _, token = raw.partition(" ")
    if scheme.strip().lower() != "bearer":
        return ""
    return token.strip()


def require_active_user(headers):
    """Restituisce {id, email} dell'utente verificato oppure solleva AuthError."""
    token = _bearer_token(headers)
    if not token:
        raise AuthError("Accesso richiesto.", 401)

    url, key = _settings()
    if not url or not key:
        raise AuthError("Autenticazione non configurata.", 503)

    try:
        user = _get_json(f"{url}/auth/v1/user", token, key)
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            raise AuthError("Sessione non valida.", 401) from error
        raise AuthError("Verifica della sessione non disponibile.", 502) from error
    except (urllib.error.URLError, OSError, ValueError) as error:
        raise AuthError("Verifica della sessione non disponibile.", 502) from error

    user_id = (user or {}).get("id") if isinstance(user, dict) else None
    if not user_id:
        raise AuthError("Sessione non valida.", 401)

    profile_url = f"{url}/rest/v1/profiles?select=status&id=eq.{quote(str(user_id))}"
    try:
        profiles = _get_json(profile_url, token, key)
    except urllib.error.HTTPError as error:
        raise AuthError("Verifica del profilo non disponibile.", 502) from error
    except (urllib.error.URLError, OSError, ValueError) as error:
        raise AuthError("Verifica del profilo non disponibile.", 502) from error

    status = profiles[0].get("status") if isinstance(profiles, list) and profiles else None
    if status != "Attivo":
        raise AuthError("Account non abilitato.", 403)

    return {"id": str(user_id), "email": user.get("email") or ""}


def send_auth_error(handler, error):
    body = json.dumps({"error": error.message}).encode("utf-8")
    handler.send_response(error.status_code)
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)
