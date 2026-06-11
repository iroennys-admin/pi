# Reglas de Desarrollo

## Estilo Conversacional

- Mantén las respuestas breves y concisas
- Sin emojis en commits, issues, comentarios de PR o código
- Sin relleno ni texto alegre innecesario (ej.: "Gracias @usuario" no "¡Muchas gracias @usuario!")
- Solo prosa técnica, sé directo
- Cuando el usuario haga una pregunta, respóndela primero antes de hacer ediciones o ejecutar comandos de implementación.
- Al responder a comentarios del usuario o a un análisis, di explícitamente si estás de acuerdo o en desacuerdo antes de decir qué cambiaste.

## Calidad del Código

- Lee los archivos completos antes de hacer cambios extensos, antes de editar archivos que no has inspeccionado completamente y cuando te pidan investigar o auditar. No confíes en fragmentos de búsqueda para cambios amplios.
- Sin `any` a menos que sea absolutamente necesario.
- Inlinea los helpers de una sola línea que tienen un solo sitio de llamada.
- Revisa node_modules para los tipos de API externas; no adivines.
- **Sin imports inline** (`await import()`, `import("pkg").Type`, imports de tipos dinámicos). Solo imports de nivel superior.
- Nunca elimines o degradues código para corregir errores de tipos de dependencias desactualizadas; mejor actualiza la dependencia.
- Usa solo sintaxis TypeScript borrable (modo strip-only de Node) en el código verificado por la configuración raíz (`packages/*/src`, `packages/*/test`, `packages/coding-agent/examples`): sin propiedades de parámetros, `enum`, `namespace`/`module`, `import =`, `export =` u otras construcciones que necesiten emisión de JS. Usa campos explícitos con asignaciones en el constructor.
- Siempre pregunta antes de eliminar funcionalidad o código que parezca intencional.
- No preserves compatibilidad hacia atrás a menos que el usuario lo pida.
- Nunca codifiques verificaciones de teclas (ej. `matchesKey(keyData, "ctrl+x")`). Añade los valores por defecto a `DEFAULT_EDITOR_KEYBINDINGS` o `DEFAULT_APP_KEYBINDINGS` para que sigan siendo configurables.
- Nunca modifiques `packages/ai/src/models.generated.ts` directamente; actualiza `packages/ai/scripts/generate-models.ts` en su lugar, luego regenera. Incluir el diff resultante de `models.generated.ts` siempre está bien, incluso si la regeneración incluye cambios no relacionados en los metadatos de modelos upstream.

## Comandos

- Después de cambios de código (no docs): `npm run check` (salida completa, sin truncar). Corrige todos los errores, advertencias e infos antes de hacer commit. No ejecuta pruebas.
- Nunca ejecutes `npm run build` o `npm test` a menos que el usuario lo pida.
- Nunca ejecutes el suite completo de vitest directamente: incluye pruebas e2e que se activan cuando las variables de entorno de endpoint/auth están presentes. Para todas las pruebas que no sean e2e, ejecuta `./test.sh` desde la raíz del repositorio. De lo contrario, ejecuta pruebas específicas desde la raíz del paquete: `node ../../node_modules/vitest/dist/cli.js --run test/specific.test.ts`.
- Si creas o modificas un archivo de prueba, ejecútalo e itera en la prueba o implementación hasta que pase.
- Para `packages/coding-agent/test/suite/`, usa `test/suite/harness.ts` + el proveedor faux. Sin APIs de proveedores reales, claves ni tokens de pago.
- Pon las regresiones específicas de issues bajo `packages/coding-agent/test/suite/regressions/` nombradas `<número-de-issue>-<slug-corto>.test.ts`.
- Para scripts ad-hoc, `escríbelos` en un archivo temporal (ej. `/tmp`), ejecuta, edita si es necesario, elimina cuando termines. No incrustes scripts multilínea en comandos `bash`.
- Nunca hagas commit a menos que el usuario lo pida.

## Seguridad de Dependencias e Instalación

- Trata los cambios de dependencias npm y del lockfile como código revisado. Las dependencias externas directas permanecen fijadas a versiones exactas.
- Hidrata/actualiza localmente con `npm install --ignore-scripts`; de forma limpia/estilo CI con `npm ci --ignore-scripts`. No ejecutes scripts de ciclo de vida a menos que el usuario lo pida.
- Si cambian los metadatos de dependencias, refresca `package-lock.json` con `npm install --package-lock-only --ignore-scripts`.
- Si `packages/coding-agent/npm-shrinkwrap.json` necesita regeneración, ejecuta `node scripts/generate-coding-agent-shrinkwrap.mjs` (verifica con `--check` o `npm run check`). Las nuevas dependencias con scripts de ciclo de vida requieren revisión y una entrada explícita en la lista de permitidos en ese script; nunca añadas una silenciosamente.
- El pre-commit bloquea commits del lockfile a menos que `PI_ALLOW_LOCKFILE_CHANGE=1`. No lo omitas a menos que el usuario quiera que se committee el cambio del lockfile.

## Git

Pueden estar ejecutándose múltiples sesiones de pi en este directorio de trabajo al mismo tiempo, cada una modificando archivos diferentes. Las operaciones de Git que toquen archivos sin stage, con stage o no rastreados fuera de tus propios cambios destruirán el trabajo de otras sesiones. Sigue estas reglas:

Al hacer commit:

- Solo haz commit de los archivos que TÚ cambiaste en ESTA sesión.
- Haz stage de rutas explícitas (`git add <ruta1> <ruta2>`); nunca `git add -A` / `git add .`.
- Antes de hacer commit, ejecuta `git status` y verifica que solo estás haciendo stage de tus archivos.
- `packages/ai/src/models.generated.ts` siempre puede incluirse junto con tus archivos.
- Formato del mensaje: `{feat,fix,docs}[(ai,tui,agent,coding-agent)]: <mensaje de commit> (opcionalmente múltiples líneas)`. El mensaje es informativo y conciso.

Nunca ejecutes (destruye el trabajo de otros agentes o omite verificaciones):

- `git reset --hard`, `git checkout .`, `git clean -fd`, `git stash`, `git add -A`, `git add .`, `git commit --no-verify`.

Si ocurren conflictos de rebase:

- Resuelve conflictos solo en los archivos que modificaste.
- Si hay un conflicto en un archivo que no modificaste, aborta y pregunta al usuario.
- Nunca hagas force push.

## Issues y PRs

Consulta `CONTRIBUTING.md` para la puerta de colaboradores (workflows de cierre automático, `lgtm`/`lgtmi`, estándar de calidad).

Al revisar PRs:

- No ejecutes `gh pr checkout`, `git switch` ni muevas el worktree a la rama del PR a menos que el usuario lo pida explícitamente.
- Usa `gh pr view`, `gh pr diff`, `gh api` y `git show`/`git diff` local contra refs descargadas para inspeccionar los metadatos del PR, commits y parches sin cambiar de rama.
- Si necesitas el contenido de archivos del PR, descárgalos/leeos en archivos temporales o usa `git show <ref>:<ruta>` sin cambiar de rama.

Al crear issues:

- Añade etiquetas `pkg:*` para los paquetes afectados (`pkg:agent`, `pkg:ai`, `pkg:coding-agent`, `pkg:tui`); usa todas las que apliquen.

Al publicar comentarios en issues/PRs:

- Escribe el comentario en un archivo temporal y publícalo con `gh issue/pr comment --body-file` (nunca markdown multilínea vía `--body`).
- Mantén los comentarios concisos, técnicos, en el tono del usuario.
- Termina cada comentario publicado por IA con la línea de descargo de responsabilidad generada por IA especificada por el prompt de origen (ej. `Este comentario es generado por IA por `/wr``).

Al cerrar issues mediante commit:

- Incluye `fixes #<número>` o `closes #<número>` en el mensaje para que al mergear se cierre automáticamente el issue. Para múltiples issues, repite la palabra clave por issue (`closes #1, closes #2`); una palabra clave compartida (`closes #1, #2`) solo cierra el primero.

## Probar el Modo Interactivo de pi con tmux

Ejecuta la TUI en una terminal controlada (desde la raíz del repositorio):

```bash
tmux new-session -d -s pi-test -x 80 -y 24
tmux send-keys -t pi-test "./pi-test.sh" Enter
sleep 3 && tmux capture-pane -t pi-test -p     # capturar después del inicio
tmux send-keys -t pi-test "tu prompt aquí" Enter
tmux send-keys -t pi-test Escape               # teclas especiales (también C-o para ctrl+o, etc.)
tmux kill-session -t pi-test
```

## Changelog

Ubicación: `packages/*/CHANGELOG.md` (uno por paquete).

Secciones bajo `## [Unreleased]`: `### Breaking Changes` (cambios de API que requieren migración), `### Added`, `### Changed`, `### Fixed`, `### Removed`.

Reglas:

- Todas las nuevas entradas van bajo `## [Unreleased]`. Lee primero la sección completa y añade a las subsecciones existentes; nunca las dupliques.
- Las secciones de versiones publicadas (ej. `## [0.12.2]`) son inmutables; nunca las modifiques.

Atribución:

- Interna (desde issues): `Fixed foo bar ([#123](https://github.com/earendil-works/pi-mono/issues/123))`
- Contribuciones externas: `Added feature X ([#456](https://github.com/earendil-works/pi-mono/pull/456) by [@username](https://github.com/username))`

## Releases

**Versionado sincronizado**: todos los paquetes comparten una versión; cada release actualiza todos juntos. `patch` = correcciones + adiciones, `minor` = cambios rupturistas. Sin releases major.

1. **Actualizar CHANGELOGs**: pregunta al usuario si ejecutó el prompt `/cl` en el último commit de `main`. Si no, debe ejecutar `/cl` primero para auditar y actualizar la sección `[Unreleased]` de cada paquete antes de hacer el release.

2. **Prueba de humo local**: construye un release no publicado y haz prueba de humo desde fuera del repositorio (para que no pueda resolver archivos del workspace):
   ```bash
   npm run release:local -- --out /tmp/pi-local-release --force
   cd /tmp

   # Pruebas de humo de instalación del paquete Node
   /tmp/pi-local-release/node/pi --help
   /tmp/pi-local-release/node/pi --version
   /tmp/pi-local-release/node/pi --list-models
   /tmp/pi-local-release/node/pi -p "Say exactly: ok"
   /tmp/pi-local-release/node/pi

   # Pruebas de humo del binario Bun
   /tmp/pi-local-release/bun/pi --help
   /tmp/pi-local-release/bun/pi --version
   /tmp/pi-local-release/bun/pi --list-models
   /tmp/pi-local-release/bun/pi -p "Say exactly: ok"
   /tmp/pi-local-release/bun/pi
   ```
   Verifica que tanto Node como Bun inicien, listen modelos/cuentas, inicien en modo interactivo y al menos un prompt real con el proveedor por defecto deseado. Los comandos sin argumentos `/tmp/pi-local-release/node/pi` y `/tmp/pi-local-release/bun/pi` inician el modo interactivo; ejecuta cada uno en tmux, envía un prompt y espera la respuesta del modelo antes de considerar la prueba de humo interactiva pasada. Los fallos son bloqueadores de release a menos que el usuario acepte explícitamente el riesgo.

3. **Ejecutar el script de release**:
   ```bash
   PI_ALLOW_LOCKFILE_CHANGE=1 npm_config_min_release_age=0 npm run release:patch    # correcciones + adiciones
   PI_ALLOW_LOCKFILE_CHANGE=1 npm_config_min_release_age=0 npm run release:minor    # cambios rupturistas
   ```
   Usa `npm_config_min_release_age=0` solo para el comando de release. La puerta de edad normal de npm del repositorio de lo contrario puede bloquear la actualización del lockfile del release cuando la versión actual del paquete del workspace fue publicada recientemente. Revisa cualquier diff del lockfile o shrinkwrap que el release cree antes de hacer push.

   El script de release incrementa las versiones de todos los paquetes, actualiza los changelogs, regenera los artefactos de release, ejecuta `npm run check`, hace commit de `Release vX.Y.Z`, etiqueta `vX.Y.Z`, añade nuevas secciones `## [Unreleased]` al changelog, hace commit de `Add [Unreleased] section for next cycle`, luego hace push de `main` y la etiqueta. No vuelvas a ejecutar el script de release después de que se haya hecho push de una etiqueta.

4. **CI publica los paquetes npm**: hacer push de la etiqueta `vX.Y.Z` activa `.github/workflows/build-binaries.yml`. El job `publish-npm` usa npm trusted publishing a través de GitHub Actions OIDC con el entorno `npm-publish`; no se requiere `npm publish` local, `npm whoami`, OTP ni flujo WebAuthn.

5. **Si la publicación de CI falla**: inspecciona el job `publish-npm` fallido. El helper de publicación es idempotente y omite las versiones de paquetes ya presentes en npm, así que vuelve a ejecutar el workflow de la etiqueta después de corregir CI o problemas transitorios de npm. No vuelvas a ejecutar `npm run release:patch` o `npm run release:minor` para la misma versión.

## Anulación del Usuario

Si las instrucciones del usuario entran en conflicto con alguna regla de este documento, pide confirmación explícita antes de anular. Solo entonces ejecuta sus instrucciones.
