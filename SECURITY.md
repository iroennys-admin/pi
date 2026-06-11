# Política de Seguridad de IROPI

Este documento describe el concepto de seguridad de IROPI y sus límites.

## Resumen

IROPI es un agente de codificación que se ejecuta localmente dentro del límite de seguridad del usuario que lo ejecuta. Es responsabilidad del usuario monitorear sus operaciones o contenerlo dentro de un contenedor, máquina virtual u otra solución de sandbox.

## Modelo de Confianza

IROPI trata la cuenta de usuario local y los archivos escribibles por esa cuenta como dentro del mismo límite de confianza que el proceso de IROPI en sí. Si un atacante puede modificar archivos bajo el directorio home del usuario, el workspace, los archivos de inicio del shell, el entorno o la configuración de IROPI, generalmente puede influir en IROPI u otras herramientas de desarrollo locales.

Los reportes que dependen de dicho acceso de escritura local previo no son vulnerabilidades de seguridad a menos que demuestren cómo IROPI otorga ese acceso de escritura o cruza un límite de privilegios del sistema operativo.

## Herramientas Web

Las herramientas `web_fetch`, `web_scrape` y `web_search` realizan peticiones de red salientes. Consideraciones:

- Las peticiones se realizan desde la máquina del usuario con sus credenciales de red
- Los datos enviados en peticiones POST/PUT pueden contener información sensible
- Los resultados de scraping pueden contener contenido malicioso de sitios web no confiables
- Se recomienda usar estas herramientas solo con sitios web de confianza

## Reportar una Vulnerabilidad

Si crees que encontraste una vulnerabilidad de seguridad en IROPI, por favor repórtala de forma privada mediante:

- Abriendo un reporte privado a través de GitHub Security Advisories para este repositorio
- Enviando un correo al mantenedor

Por favor incluye:

- Una descripción del problema y su impacto
- Pasos para reproducir, prueba de concepto o logs relevantes
- Paquete afectado, versión, commit o configuración
- Cualquier mitigación conocida

**No abras un issue público para reportes sensibles de seguridad.**

## Alcance

Los problemas de seguridad en los paquetes distribuidos, herramientas de línea de comandos, APIs y código del repositorio están dentro del alcance.

## Fuera de Alcance

- Ejecución de código local o comportamiento de sandboxing (IROPI intencionalmente no tiene sandbox)
- Comportamiento de extensiones o skills instaladas por el usuario
- Riesgos de trabajar en repositorios no confiables
- Riesgos de instalar extensiones, skills, paquetes o herramientas no confiables
- Ataques de inyección de prompts
- Secretos expuestos que son credenciales de terceros/controladas por el usuario
- Reportes que requieren la capacidad de crear, modificar, eliminar o reemplazar archivos en la máquina del usuario
- Problemas causados por una configuración de usuario intencionalmente debilitada
- Comportamiento de las herramientas web al acceder a sitios maliciosos (es responsabilidad del usuario)
