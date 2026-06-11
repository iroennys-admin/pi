<p align="center">
  <a href="https://pi.dev">
    <img alt="logo de pi" src="https://pi.dev/logo-auto.svg" width="128">
  </a>
</p>
<p align="center">
  <a href="https://discord.com/invite/3cU7Bz4UPx"><img alt="Discord" src="https://img.shields.io/badge/discord-comunidad-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
</p>
<p align="center">
  El dominio <a href="https://pi.dev">pi.dev</a> ha sido amablemente donado por
  <br /><br />
  <a href="https://exe.dev"><img src="packages/coding-agent/docs/images/exy.png" alt="Mascota Exy" width="48" /><br />exe.dev</a>
</p>

> Los nuevos issues y PRs de nuevos colaboradores se cierran automáticamente por defecto. Los mantenedores revisan los issues cerrados automáticamente a diario. Consulta [CONTRIBUTING.md](CONTRIBUTING.md).

---

# Mono Repositorio del Harness de Agentes Pi

Este es el hogar del proyecto del harness de agentes pi, incluyendo nuestro agente de codificación autoextensible.

* **[@earendil-works/pi-coding-agent](packages/coding-agent)**: CLI interactivo del agente de codificación
* **[@earendil-works/pi-agent-core](packages/agent)**: Runtime del agente con llamada a herramientas y gestión de estado
* **[@earendil-works/pi-ai](packages/ai)**: API LLM unificada multi-proveedor (OpenAI, Anthropic, Google, …)

Para saber más sobre pi:

* [Visita pi.dev](https://pi.dev), el sitio web del proyecto con demos
* [Lee la documentación](https://pi.dev/docs/latest), aunque también puedes pedirle al agente que se explique a sí mismo

## Comparte tus sesiones de agente de codificación OSS

Si usas pi u otros agentes de codificación para trabajo de código abierto, por favor comparte tus sesiones.

Los datos públicos de sesiones OSS ayudan a mejorar los agentes de codificación con tareas del mundo real, uso de herramientas, fallos y correcciones en lugar de benchmarks de juguete.

Para la explicación completa, consulta [esta publicación en X](https://x.com/badlogicgames/status/2037811643774652911).

Para publicar sesiones, usa [`badlogic/pi-share-hf`](https://github.com/badlogic/pi-share-hf). Lee su README.md para las instrucciones de configuración. Todo lo que necesitas es una cuenta de Hugging Face, la CLI de Hugging Face y `pi-share-hf`.

También puedes ver [este video](https://x.com/badlogicgames/status/2041151967695634619), donde muestro cómo publico mis sesiones de `pi-mono`.

Publico regularmente mis propias sesiones de trabajo de `pi-mono` aquí:

- [badlogicgames/pi-mono en Hugging Face](https://huggingface.co/datasets/badlogicgames/pi-mono)

## Todos los Paquetes

| Paquete | Descripción |
|---------|-------------|
| **[@earendil-works/pi-ai](packages/ai)** | API LLM unificada multi-proveedor (OpenAI, Anthropic, Google, etc.) |
| **[@earendil-works/pi-agent-core](packages/agent)** | Runtime del agente con llamada a herramientas y gestión de estado |
| **[@earendil-works/pi-coding-agent](packages/coding-agent)** | CLI interactivo del agente de codificación |
| **[@earendil-works/pi-tui](packages/tui)** | Librería de UI de terminal con renderizado diferencial |

Para automatización y flujos de trabajo en Slack/chat, consulta [earendil-works/pi-chat](https://github.com/earendil-works/pi-chat).

## Permisos y Contenerización

Pi no incluye un sistema de permisos integrado para restringir el acceso al sistema de archivos, procesos, red o credenciales. Por defecto, se ejecuta con los permisos del usuario y del proceso que lo lanzó.

Si necesitas límites más estrictos, conteneriza o aísla Pi en un sandbox. Consulta [packages/coding-agent/docs/containerization.md](packages/coding-agent/docs/containerization.md) para tres patrones:

- **OpenShell**: ejecuta todo el proceso `pi` en un sandbox controlado por políticas.
- **Extensión Gondolin**: mantiene `pi` y la autenticación del proveedor en el host mientras enruta las herramientas integradas y los comandos `!` hacia una micro-VM local de Linux.
- **Docker simple**: ejecuta todo el proceso `pi` en un contenedor local para aislamiento sencillo.

## Contribuir

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para las guías de contribución y [AGENTS.md](AGENTS.md) para las reglas específicas del proyecto (tanto para humanos como para agentes).

## Desarrollo

```bash
npm install --ignore-scripts  # Instalar todas las dependencias sin ejecutar scripts de ciclo de vida
npm run build        # Construir todos los paquetes
npm run check        # Lint, formato y verificación de tipos
./test.sh            # Ejecutar pruebas (omite las pruebas dependientes de LLM sin claves API)
./pi-test.sh         # Ejecutar pi desde el código fuente (se puede ejecutar desde cualquier directorio)
```

## Endurecimiento de la cadena de suministro

Tratamos los cambios en las dependencias npm como cambios de código revisados.

- Las dependencias externas directas están fijadas a versiones exactas. Los paquetes internos del workspace permanecen con versiones por rango.
- `.npmrc` establece `save-exact=true` y `min-release-age=2` para evitar dependencias del mismo día durante la resolución de npm.
- `package-lock.json` es la verdad fundamental de las dependencias. El pre-commit bloquea commits accidentales del lockfile a menos que se establezca `PI_ALLOW_LOCKFILE_CHANGE=1`.
- `npm run check` verifica las dependencias directas fijadas, la compatibilidad de importación nativa de TypeScript y el shrinkwrap generado del coding-agent.
- El paquete CLI publicado incluye `packages/coding-agent/npm-shrinkwrap.json`, generado a partir del lockfile raíz, para fijar las dependencias transitivas para los usuarios de npm.
- Las pruebas de humo de release usan `npm run release:local` para construir, empaquetar y crear instalaciones aisladas de npm y Bun fuera del repositorio antes de etiquetar un release.
- Las instalaciones locales de release, las instalaciones npm documentadas y `pi update --self` usan `--ignore-scripts` donde sea compatible.
- CI instala con `npm ci --ignore-scripts`, y un flujo de trabajo programado de GitHub ejecuta `npm audit --omit=dev` más `npm audit signatures --omit=dev`.
- La generación del shrinkwrap tiene una lista de permitidos explícita para los scripts de ciclo de vida de las dependencias; las nuevas dependencias con scripts de ciclo de vida fallan las verificaciones hasta que sean revisadas.

## Licencia

MIT
