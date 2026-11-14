# Aplicación local de Gestión Esencial

Consulta el [README principal](../README.md) para instalación, pruebas, cuentas, datos y requisitos de producción.

```sh
npm ci
npm run dev
```

Para probar el contenedor después de inicializar y configurar la copia local, con Docker Desktop iniciado:

```sh
node scripts/prepare-review-data.mjs
docker compose -f compose.review.yaml up -d --build
```

La copia aislada escucha en http://127.0.0.1:4322/. Usa datos separados en `.local/review-data/`, que no se incluyen en Git. Consulta la [guía de Docker](../08_REVISION_AISLADA_DOCKER.md) para permisos, proxy y operación del túnel temporal.
