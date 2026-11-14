# Revisión aislada con Docker

Esta configuración es para la misma demostración local, con una capa adicional de aislamiento antes de abrir un túnel. Conserva los usuarios, sus hashes de contraseña y los contenidos existentes en una copia separada. Las sesiones anteriores no se trasladan activas.

## Qué se restringe

- La aplicación y el proxy corren dentro de un contenedor Linux con UID/GID 1000, sin root.
- El sistema de archivos del contenedor es de solo lectura; la app solo escribe en `/data` y en el temporal `/tmp`.
- Se eliminan todas las capacidades de Linux y se activa `no-new-privileges`.
- El contenedor no monta la carpeta del proyecto, el perfil de Windows, OneDrive completo ni el socket de Docker.
- Solo se monta `.local/review-data`, una copia con SQLite y los originales de imágenes, más un archivo de origen público de solo lectura.
- El contexto de construcción excluye bases, contraseñas de entorno, correo simulado, documentos de trabajo y archivos personales.
- Memoria máxima: 768 MB; CPU: 1,5; procesos: 128; temporal: 128 MB.
- El contenedor usa su propia red de Docker, sin compartir la red del anfitrión. Solo se publican los puertos 4319 y 4322 en `127.0.0.1` del PC, no en todas sus interfaces.

Esto reduce el alcance de un fallo de la aplicación. No garantiza aislamiento absoluto ni sustituye mantener Docker/Windows actualizados, la autenticación o las validaciones de la app. Una cuenta comprometida aún podría manipular los datos a los que tenga acceso dentro de esta copia.

## Preparar y ejecutar

Desde la carpeta `web`, con Docker Desktop iniciado:

```powershell
node scripts/prepare-review-data.mjs
docker compose -f compose.review.yaml up -d --build
```

El primer comando genera una copia consistente usando la función de respaldo existente; no sobrescribe una copia aislada previa. La cuenta y contraseña de prueba siguen siendo las mismas. Los productos y proyectos editados en esta versión se guardan en `.local/review-data`, separados de `.local/catalog.sqlite`.

La vista local aislada queda en http://127.0.0.1:4322/. Para detenerla:

```powershell
docker compose -f compose.review.yaml stop
```

Para revisar estado o errores:

```powershell
docker compose -f compose.review.yaml ps
docker compose -f compose.review.yaml logs --tail 50
```

## Túnel temporal

El túnel debe apuntar al proxy en `http://127.0.0.1:4319`, no directamente a la aplicación. Guarda el origen HTTPS exacto asignado por Cloudflare en `web/.local/review-origin.txt` para que el proxy lo acepte. El proxy comprueba el host y el origen, adapta las solicitudes para la versión local, conserva la autenticación y bloquea la bandeja de recuperación simulada y la creación inicial del propietario.

La aplicación y el proxy están dentro del contenedor. `cloudflared` se ejecuta en el PC y solo conecta con el proxy local. La cuenta de Cloudflare y las herramientas del PC no se montan dentro del contenedor.

No se mantiene el túnel vivo por defecto. Apagar o suspender el PC, cerrar Docker Desktop o detener `cloudflared` interrumpe la revisión. No se configura inicio automático de Windows ni publicación permanente.

Documentación: [Docker: ejecutar contenedores](https://docs.docker.com/engine/containers/run/), [opciones de solo lectura y permisos](https://docs.docker.com/reference/cli/docker/container/run/), [seguridad del motor](https://docs.docker.com/engine/security/).
