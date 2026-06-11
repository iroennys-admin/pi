# Política de Seguridad

Este documento debería guiarte sobre cómo entender el concepto de seguridad detrás de Pi y también cuáles son sus límites.

En general, Pi es un agente de codificación que se ejecuta localmente dentro del límite de seguridad del usuario que lo ejecuta. Es responsabilidad del usuario monitorear sus operaciones o contenerlo dentro de un contenedor, máquina virtual u otra solución de sandbox.

Pi trata la cuenta de usuario local y los archivos escribibles por esa cuenta como dentro del mismo límite de confianza que el proceso de Pi en sí. Si un atacante puede modificar archivos bajo el directorio home del usuario, el workspace, los archivos de inicio del shell, el entorno o la configuración de Pi, generalmente puede influir en Pi u otras herramientas de desarrollo locales. Los reportes que dependen de dicho acceso de escritura local previo no son vulnerabilidades de seguridad a menos que demuestren cómo Pi otorga ese acceso de escritura o cruza un límite de privilegios del sistema operativo.

Pi depende de que los usuarios instalen extensiones confiables y carguen skills confiables, y que solo usen pi dentro de repositorios de confianza. Esto se debe a que archivos como `AGENTS.md` o instrucciones en comentarios pueden usarse para inyectar prompts al agente de codificación de forma trivial, y esto no puede protegerse.

## Reportar una Vulnerabilidad

Si crees que encontraste una vulnerabilidad de seguridad en pi u otro paquete en este repositorio, por favor repórtala de forma privada mediante:

- Enviando un correo a `security@earendil.com`, o
- Abriendo un reporte privado a través de GitHub Security Advisories para este repositorio

Por favor incluye:

- Una descripción del problema y su impacto
- Pasos para reproducir, prueba de concepto o logs relevantes
- Paquete afectado, versión, commit o configuración
- Cualquier mitigación conocida

No abras un issue público para reportes sensibles de seguridad. Revisaremos los reportes y coordinaremos la divulgación según corresponda.

## Alcance

Los problemas de seguridad en los paquetes distribuidos, herramientas de línea de comandos, APIs y código del repositorio están dentro del alcance, así como la infraestructura operada por earendil en `pi.dev`.

## Fuera de Alcance

- Ejecución de código local o comportamiento de sandboxing (el agente de codificación Pi intencionalmente no tiene sandbox)
- Comportamiento de extensiones o skills de pi instaladas por el usuario
- Riesgos de trabajar en repositorios no confiables
- Riesgos de instalar extensiones, skills, paquetes o herramientas no confiables
- Problemas causados por proxies MITM no confiables
- Exposición pública de internet de una instalación de Pi
- Ataques de inyección de prompts
- Secretos expuestos que son credenciales de terceros/controladas por el usuario
- Reportes que requieren la capacidad de crear, modificar, eliminar o reemplazar archivos, directorios, symlinks, variables de entorno, configuración del shell u otro estado local controlado por el usuario en la máquina objetivo. Esto incluye `~/.pi`, `~/.pi/agent/models.json`, archivos del workspace, `AGENTS.md`, skills, extensiones, configuración de extensiones, dotfiles y archivos sincronizados a través de NFS, perfiles roaming o gestores de dotfiles, a menos que el reporte muestre cómo Pi mismo otorga ese acceso.
- Problemas causados por una configuración de usuario intencionalmente debilitada.
- Reclamos de recursos/DOS que requieren entrada/configuración confiable local contra el agente de codificación pi.
- Reportes sobre salida maliciosa del modelo.
- Acciones locales aprobadas o iniciadas por el usuario presentadas como vulnerabilidades.

## Notas para los Reportantes

Los reportes más útiles muestran un bypass de límite de seguridad actual y reproducible con impacto demostrado. Los reportes que solo muestran el comportamiento esperado de un agente local, inyección de prompts o una extensión/skill confiable maliciosa no son vulnerabilidades de seguridad bajo este modelo.

Por ejemplo, un reporte que muestra que contenidos maliciosos escritos en un archivo de configuración confiable de Pi hacen que Pi ejecute comandos, cargue herramientas controladas por un atacante, envíe credenciales a un endpoint controlado por un atacante o cambie su comportamiento de otra manera está fuera de alcance.

Cuando sea posible, incluye la ruta exacta afectada, la versión del paquete o el SHA del commit, la configuración y una prueba de concepto contra el último release o el último `main`. Para reportes de dependencias, incluye evidencia de que la dependencia distribuida está afectada y que el problema es alcanzable a través de Pi. Para reportes de secretos expuestos, incluye evidencia de que la credencial es propiedad de Earendil o otorga acceso a infraestructura o servicios operados por Earendil.
