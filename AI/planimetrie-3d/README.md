# Fenix Planimetrie 3D AI

Questo modulo contiene la base operativa per la generazione di planimetrie 3D collegata alla sezione `Planimetrie`.

## Flusso

1. L'utente descrive l'immobile nella sezione `Planimetrie > 3D AI`.
2. Il frontend invia il prompt a `POST /api/planimetrie-3d`.
3. Il backend usa Hugging Face, se `HF_TOKEN` e' configurato, per trasformare il testo in un layout JSON strutturato.
4. Se Hugging Face non e' disponibile, il backend usa un fallback locale deterministico.
5. Il frontend normalizza il JSON e lo renderizza in 3D con Three.js.

## Variabili ambiente

- `HF_TOKEN`: token Hugging Face, solo lato backend.
- `HF_3D_MODEL`: modello opzionale. Default: `Qwen/Qwen3-4B-Instruct-2507`.

Il token non deve mai essere esposto nel browser.

## Output atteso

Il modello deve restituire solo JSON valido secondo lo schema in `schema.json`.
