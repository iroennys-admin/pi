# Reglas de Desarrollo de IROPI

## Estilo Conversacional

- Mantén las respuestas breves y concisas
- Sin emojis en commits, issues, comentarios de PR o código
- Sin relleno ni texto alegre innecesario (ej.: "Gracias @usuario" no "¡Muchas gracias @usuario!")
- Solo prosa técnica, sé directo
- Cuando el usuario haga una pregunta, respóndela primero antes de hacer ediciones o ejecutar comandos de implementación
- Al responder a comentarios del usuario o a un análisis, di explícitamente si estás de acuerdo o en desacuerdo antes de decir qué cambiaste

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
- Nunca modifiques `packages/ai/src/models.generated.ts` directamente; actualiza `packages/ai/scripts/generate-models.ts` en su lugar, luego regenera.

## Comandos

- Después de cambios de código (no docs): `npm run check` (salida completa, sin truncar). Corrige todos los errores, advertencias e infos antes de hacer commit. No ejecuta pruebas.
- Nunca ejecutes `npm run build` o `npm test` a menos que el usuario lo pida.
- Nunca ejecutes el suite completo de vitest directamente: incluye pruebas e2e que se activan cuando las variables de entorno de endpoint/auth están presentes. Para todas las pruebas que no sean e2e, ejecuta `./test.sh` desde la raíz del repositorio.
- Si creas o modificas un archivo de prueba, ejecútalo e itera en la prueba o implementación hasta que pase.
- Para scripts ad-hoc, escríbelos en un archivo temporal (ej. `/tmp`), ejecuta, edita si es necesario, elimina cuando termines.
- Nunca hagas commit a menos que el usuario lo pida.

## Herramientas Web

IROPI incluye tres herramientas web que siguen el mismo patrón que las herramientas nativas:

- **web_fetch**: Obtiene contenido de URLs. Usa Node.js `fetch` con timeout de 30s.
- **web_scrape**: Extrae datos estructurados de páginas web con selectores CSS básicos.
- **web_search**: Busca en internet usando DuckDuckGo HTML (sin API key necesario).

Al agregar nuevas herramientas web, seguir el patrón en `packages/coding-agent/src/core/tools/web-*.ts`:

1. Crear esquema typebox con descripciones en español
2. Implementar `createXxxTool()` y `createXxxToolDefinition()`
3. Registrar en `index.ts` (ToolName, allToolNames, switch cases, etc.)
4. Manejar errores con mensajes en español
5. Soportar AbortSignal para cancelación

## Seguridad de Dependencias e Instalación

- Trata los cambios de dependencias npm y del lockfile como código revisado. Las dependencias externas directas permanecen fijadas a versiones exactas.
- Hidrata/actualiza localmente con `npm install --ignore-scripts`; de forma limpia/estilo CI con `npm ci --ignore-scripts`. No ejecutes scripts de ciclo de vida a menos que el usuario lo pida.
- Si cambian los metadatos de dependencias, refresca `package-lock.json` con `npm install --package-lock-only --ignore-scripts`.
- El pre-commit bloquea commits del lockfile a menos que `IROPI_ALLOW_LOCKFILE_CHANGE=1`. No lo omitas a menos que el usuario quiera que se committee el cambio del lockfile.

## Git

Pueden estar ejecutándose múltiples sesiones de IROPI en este directorio de trabajo al mismo tiempo, cada una modificando archivos diferentes. Las operaciones de Git que toquen archivos fuera de tus propios cambios destruirán el trabajo de otras sesiones. Sigue estas reglas:

Al hacer commit:

- Solo haz commit de los archivos que TÚ cambiaste en ESTA sesión.
- Haz stage de rutas explícitas (`git add <ruta1> <ruta2>`); nunca `git add -A` / `git add .`.
- Antes de hacer commit, ejecuta `git status` y verifica que solo estás haciendo stage de tus archivos.
- `packages/ai/src/models.generated.ts` siempre puede incluirse junto con tus archivos.
- Formato del mensaje: `{feat,fix,docs}[(ai,tui,agent,coding-agent)]: <mensaje de commit>`. El mensaje es informativo y conciso.

Nunca ejecutes (destruye el trabajo de otros agentes o omite verificaciones):

- `git reset --hard`, `git checkout .`, `git clean -fd`, `git stash`, `git add -A`, `git add .`, `git commit --no-verify`.

## Issues y PRs

Cuando crees issues:

- Añade etiquetas `pkg:*` para los paquetes afectados (`pkg:agent`, `pkg:ai`, `pkg:coding-agent`, `pkg:tui`); usa todas las que apliquen.

Al publicar comentarios en issues/PRs:

- Escribe el comentario en un archivo temporal y publícalo con `gh issue/pr comment --body-file`.
- Mantén los comentarios concisos, técnicos, en el tono del usuario.

## Changelog

Ubicación: `packages/*/CHANGELOG.md` (uno por paquete).

Secciones bajo `## [Unreleased]`: `### Breaking Changes` (cambios de API que requieren migración), `### Added`, `### Changed`, `### Fixed`, `### Removed`.

Reglas:

- Todas las nuevas entradas van bajo `## [Unreleased]`. Lee primero la sección completa y añade a las subsecciones existentes; nunca las dupliques.
- Las secciones de versiones publicadas (ej. `## [0.12.2]`) son inmutables; nunca las modifiques.

## Anulación del Usuario

Si las instrucciones del usuario entran en conflicto con alguna regla de este documento, pide confirmación explícita antes de anular. Solo entonces ejecuta sus instrucciones.
