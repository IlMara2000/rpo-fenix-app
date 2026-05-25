# Fenix Planimetrie AI

Questo modulo contiene la base operativa per la generazione di planimetrie 3D collegata alla sezione `Planimetrie`.

## Flusso

1. L'utente carica una planimetria JPG/PNG/WEBP e inserisce una descrizione manuale.
2. Il frontend invia il payload a `POST /api/planimetrie-3d`.
3. Il backend usa Hugging Face, se `HF_TOKEN` e' configurato, per trasformare immagine e testo in un layout JSON strutturato.
4. Se Hugging Face non e' disponibile, il backend usa un fallback locale deterministico.
5. Il frontend normalizza il JSON, lo renderizza come rilievo 3D sopra la planimetria 2D e permette di scaricare il risultato finale in JPG.

## Variabili ambiente

- `HF_TOKEN`: token Hugging Face, solo lato backend.
- `HF_3D_MODEL`: modello testo opzionale. Default: `Qwen/Qwen3-4B-Instruct-2507`.
- `HF_3D_VISION_MODEL`: modello immagine opzionale. Default: `Qwen/Qwen3-VL-4B-Instruct`.

Il token non deve mai essere esposto nel browser.

## Output atteso

Il modello deve restituire solo JSON valido secondo lo schema in `schema.json`.
