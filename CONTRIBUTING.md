# Contribuir a pi

Esta guía existe para ahorrar tiempo a ambas partes.

## La Única Regla

**Debes entender tu código.** Si no puedes explicar qué hacen tus cambios y cómo interactúan con el resto del sistema, tu PR será cerrado.

Usar IA para escribir código está bien. Enviar código generado por IA sin entenderlo no lo está.

Si usas un agente, ejecútalo desde el directorio raíz de `pi-mono` para que recoja `AGENTS.md` automáticamente. Tu agente debe seguir las reglas y directrices de ese archivo.

## Puerta de Contribución

Todos los issues y PRs de nuevos colaboradores se cierran automáticamente por defecto.

Los issues enviados entre viernes y domingo no se revisan. Si algo es urgente, pregunta en Discord: https://discord.com/invite/3cU7Bz4UPx

Los mantenedores revisan los issues cerrados automáticamente a diario y reabren los que valen la pena. Los issues que no cumplan con el estándar de calidad a continuación no serán reabiertos ni recibirán respuesta.

La aprobación ocurre a través de respuestas de los mantenedores en los issues:

- `lgtmi`: tus futuros issues no se cerrarán automáticamente
- `lgtm`: tus futuros issues y PRs no se cerrarán automáticamente

`lgtmi` no otorga derechos para enviar PRs. Solo `lgtm` otorga derechos para enviar PRs.

## Estándar de Calidad para Issues

Si abres un issue, debes usar una de las dos plantillas de issues de GitHub.

Si abres un issue, manténlo breve, concreto y que valga la pena leer.

- Sé conciso. Si no cabe en una pantalla, es demasiado largo.
- Escribe con tu propia voz.
- Explica el bug o la solicitud claramente.
- Explica por qué importa.
- Si quieres implementar el cambio tú mismo, dilo.

Si el issue es real y está bien escrito, un mantenedor puede reabrirlo, responder `lgtmi` o responder `lgtm`.

## Bloqueos

Si ignoras este documento dos veces, o si inundas el tracker con issues generados por agentes, tu cuenta de GitHub será bloqueada permanentemente.

Si envías un gran volumen de issues a través de automatización, tu cuenta de GitHub será bloqueada permanentemente. Sin marcha atrás.

## Antes de Enviar un PR

No abras un PR a menos que ya hayas sido aprobado con `lgtm`.

Antes de enviar un PR:

```bash
npm run check
./test.sh
```

Ambos deben pasar.

No edites `CHANGELOG.md`. Las entradas del changelog las añaden los mantenedores.

Si estás añadiendo un nuevo proveedor a `packages/ai`, consulta `AGENTS.md` para las pruebas requeridas.

## Filosofía

El núcleo de pi es mínimo. Si tu función no pertenece al núcleo, debería ser una extensión. Los PRs que hinchen el núcleo probablemente serán rechazados.

## ¿Preguntas?

Pregunta en [Discord](https://discord.com/invite/nKXTsAcmbT).

## Preguntas Frecuentes

### ¿Por qué los nuevos issues y PRs se cierran automáticamente?

pi recibe más issues de los que los mantenedores pueden revisar responsablemente en tiempo real. Muchos reportes no cumplen con el estándar de calidad de esta guía o no siguen CONTRIBUTING.md. Algunos se lanzan al repositorio de forma mecánica a través de un agente en lugar de ser revisados y formados por la persona que los envía. El cierre automático crea un buffer para que los mantenedores puedan revisar el tracker a su propio ritmo y reabrir los issues que cumplan con el estándar de calidad.

### ¿Por qué no se revisan los issues del fin de semana?

Los mantenedores necesitan tiempo ininterrumpido lejos del tracker de issues. Los issues enviados entre viernes y domingo se cierran automáticamente y no forman parte de la cola de revisión del lunes. Si un problema es urgente, pregunta en Discord e incluye la versión corta, un repro y los logs relevantes.

### ¿Por qué algunos issues no reciben respuesta?

Una respuesta también es trabajo de mantenimiento. Los issues de baja señal, reportes poco claros, duplicados e issues que no siguen esta guía pueden cerrarse sin discusión. Esto mantiene el tiempo disponible para bugs reproducibles, solicitudes reflexivas y colaboradores que han hecho el trabajo para hacer su reporte accionable.

### ¿Por qué no dejar que la IA triage todo?

La IA puede ayudar a agrupar duplicados, resumir reportes y detectar información faltante. No se confía en ella para tomar decisiones finales de los mantenedores. Los issues generados por IA pulidos aún pueden estar equivocados, ser engañosos o costosos de investigar. La revisión humana sigue siendo la puerta final.

### ¿Es esto hostil para los colaboradores?

No. Es una barrera de protección contra el burnout y el spam en el tracker. Los issues breves, concretos y reproducibles son bienvenidos. Las contribuciones reflexivas son bienvenidas. El código automatizado sin sentido, la sensación de entitlement y los grandes volúmenes de reportes de bajo esfuerzo no lo son.
