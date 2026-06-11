# Contribuir a IROPI

Esta guía existe para ahorrar tiempo a ambas partes y asegurar que las contribuciones sean de alta calidad.

## La Única Regla

**Debes entender tu código.** Si no puedes explicar qué hacen tus cambios y cómo interactúan con el resto del sistema, tu PR será cerrado.

Usar IA para escribir código está bien. Enviar código generado por IA sin entenderlo no lo está.

Si usas un agente, ejecútalo desde el directorio raíz del repositorio para que recoja `AGENTS.md` automáticamente. Tu agente debe seguir las reglas y directrices de ese archivo.

## Cómo Contribuir

1. **Fork** este repositorio
2. Crea una **rama** para tu feature: `git checkout -b feature/mi-mejora`
3. Haz tus cambios y **prueba** que funcionen
4. Envía un **Pull Request** con una descripción clara

### Antes de Enviar un PR

```bash
npm run check
./test.sh
```

Ambos deben pasar.

No edites `CHANGELOG.md`. Las entradas del changelog las añaden los mantenedores.

## Estándar de Calidad para Issues

Si abres un issue, debes usar una de las plantillas de issues de GitHub.

- Sé conciso. Si no cabe en una pantalla, es demasiado largo.
- Escribe con tu propia voz.
- Explica el bug o la solicitud claramente.
- Explica por qué importa.
- Si quieres implementar el cambio tú mismo, dilo.

## Filosofía del Proyecto

El núcleo de IROPI es mínimo. Si tu función no pertenece al núcleo, debería ser una extensión. PRs que hinchen el núcleo probablemente serán rechazados.

### Agregar Nuevas Herramientas

Si deseas agregar una herramienta nueva, sigue el patrón de las herramientas existentes en `packages/coding-agent/src/core/tools/`:

1. Crea un archivo `mi-herramienta.ts` con `createMiHerramientaTool()` y `createMiHerramientaToolDefinition()`
2. Usa typebox para definir el esquema de parámetros
3. Registra la herramienta en `index.ts`
4. Agrega las descripciones en español
5. Incluye pruebas

## Guía de Estilo

- **Idioma**: Las descripciones de herramientas y mensajes de usuario deben estar en español
- **Código**: Nombres de variables y funciones en inglés
- **Commits**: Formato `{feat,fix,docs}[(ai,tui,agent,coding-agent)]: descripción`
- **Sin emojis** en commits, issues, PRs o código

## Preguntas Frecuentes

### ¿Puedo usar IA para contribuir?

Sí, siempre y cuando entiendas completamente los cambios que estás enviando. Los PRs que contengan código generado por IA sin comprensión serán cerrados.

### ¿Cómo reporto un bug?

Abre un issue usando la plantilla de bug report. Incluye pasos para reproducir, comportamiento esperado y comportamiento actual.

### ¿Cómo sugiero una nueva herramienta?

Abre un issue con la etiqueta "enhancement" describiendo la herramienta, su caso de uso y cómo beneficiaría al proyecto.

## Contacto

- **Issues**: [GitHub Issues](https://github.com/iroennys-admin/pi/issues)
- **Repositorio**: [github.com/iroennys-admin/pi](https://github.com/iroennys-admin/pi)
