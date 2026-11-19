# fenix-suite

## Hook pre-commit

Dopo il clone abilita il controllo che blocca il commit di file di credenziali (`.env*`, `*.pem`, `*.key`, `*.p12`, `id_rsa`, `secrets`/`credentials`):

```sh
./scripts/install-hooks.sh
```
