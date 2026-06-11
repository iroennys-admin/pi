<p align="center">
  <a href="https://github.com/iroennys-admin/pi">
    <img alt="Logo de IROPI" src="https://pi.dev/logo-auto.svg" width="128">
  </a>
</p>
<p align="center">
  <a href="https://github.com/iroennys-admin/pi"><img alt="GitHub" src="https://img.shields.io/badge/github-repo-181717?style=flat-square&logo=github&logoColor=white" /></a>
  <img alt="Versión" src="https://img.shields.io/badge/versión-0.79.1-blue?style=flat-square" />
  <img alt="Licencia" src="https://img.shields.io/badge/licencia-MIT-green?style=flat-square" />
</p>

<h1 align="center">IROPI</h1>
<p align="center"><strong>Agente de Codificación AI Avanzado con Web Scraping</strong></p>
<p align="center">Creado por <a href="https://github.com/iroennys-admin">iroennys-admin</a></p>

---

> IROPI es un agente de codificación AI potenciado con herramientas avanzadas de desarrollo, web scraping, búsqueda web y más. Basado en el excelente proyecto Pi Agent Harness, mejorado y personalizado con nuevas capacidades y documentación completa en español.

---

## Características

- **Agente de codificación interactivo** con interfaz TUI completa en terminal
- **10 herramientas integradas** incluyendo web scraping, búsqueda web y fetching de URLs
- **Soporte multi-proveedor** — OpenAI, Anthropic, Google, Mistral, Bedrock, Azure, OpenRouter y más
- **Sistema de extensiones** para agregar funcionalidades personalizadas
- **Gestión de sesiones** con persistencia, bifurcación y compactación automática
- **Documentación completa en español**
- **Instalación simplificada** con script personalizado

## Herramientas Incluidas

| Herramienta | Descripción |
|-------------|-------------|
| **read** | Leer archivos y directorios con soporte de rangos de líneas |
| **bash** | Ejecutar comandos de shell con timeout y gestión de procesos |
| **edit** | Editar archivos con reemplazo exacto de cadenas |
| **write** | Escribir y crear archivos nuevos |
| **grep** | Buscar patrones en archivos con soporte de regex |
| **find** | Buscar archivos por nombre, patrón o tipo |
| **ls** | Listar contenido de directorios |
| **web_fetch** | Obtener contenido de URLs — páginas web, APIs REST, archivos de texto |
| **web_scrape** | Extraer datos estructurados de páginas web con selectores CSS |
| **web_search** | Buscar en internet usando DuckDuckGo — títulos, URLs y descripciones |

## Paquetes

| Paquete | Descripción |
|---------|-------------|
| **@iroennys/iropi-ai** | API LLM unificada multi-proveedor (OpenAI, Anthropic, Google, etc.) |
| **@iroennys/iropi-agent-core** | Runtime del agente con llamada a herramientas y gestión de estado |
| **@iroennys/iropi-coding-agent** | CLI interactivo del agente de codificación con todas las herramientas |
| **@iroennys/iropi-tui** | Librería de UI de terminal con renderizado diferencial |

Para automatización y flujos de trabajo en Slack/chat, consulta el paquete de chat original en [earendil-works/pi-chat](https://github.com/earendil-works/pi-chat).

## Instalación

### Método Rápido (Recomendado)

```bash
# Clonar e instalar con el script personalizado
git clone https://github.com/iroennys-admin/pi.git
cd pi
chmod +x install.sh
./install.sh
```

### Instalación con npm

```bash
npm install -g @iroennys/iropi-coding-agent --ignore-scripts
```

### Instalación con Bun

```bash
bun install -g @iroennys/iropi-coding-agent --ignore-scripts
```

### Instalación desde Fuente

```bash
./install.sh --source
```

O manualmente:

```bash
git clone https://github.com/iroennys-admin/pi.git
cd pi
npm install --ignore-scripts
npm run build
cd packages/coding-agent
npm link
```

### Desinstalación

```bash
./install.sh --uninstall
# O manualmente:
npm uninstall -g @iroennys/iropi-coding-agent
```

## Inicio Rápido

```bash
# 1. Configura tu API key (elige tu proveedor favorito)
export GEMINI_API_KEY=tu_key_aquí        # Google Gemini (gratuito)
export ANTHROPIC_API_KEY=tu_key_aquí      # Claude
export OPENAI_API_KEY=tu_key_aquí         # OpenAI

# 2. Ejecuta IROPI
iropi

# 3. ¡Empieza a programar con IA!
# Ejemplo: "Crea un servidor Express con TypeScript"
# Ejemplo: "Busca en internet cómo usar la API de GitHub"
# Ejemplo: "Extrae los títulos de https://news.ycombinator.com"
```

## Uso de Herramientas Web

### web_fetch — Obtener contenido web

```
# El agente puede usar web_fetch para leer páginas y APIs:
> Lee el contenido de https://api.github.com/repos/iroennys-admin/pi
> Descarga el README de https://example.com
> Consulta la API REST en https://api.example.com/data
```

### web_scrape — Extraer datos de páginas web

```
# Extraer datos estructurados con selectores CSS:
> Extrae todos los enlaces de https://news.ycombinator.com
> Scrapea los títulos de la página usando el selector h2.title
> Obtén todas las imágenes de https://example.com
> Extrae las tablas de datos de https://example.com/data
```

### web_search — Buscar en internet

```
# Búsqueda web directa:
> Busca en internet cómo configurar Docker con Node.js
> Busca la documentación de React 19
> Encuentra tutoriales de TypeScript avanzado
```

## Permisos y Contenerización

IROPI no incluye un sistema de permisos integrado para restringir el acceso al sistema de archivos, procesos, red o credenciales. Por defecto, se ejecuta con los permisos del usuario y del proceso que lo lanzó.

Si necesitas límites más estrictos, conteneriza o aísla IROPI en un sandbox. Consulta [packages/coding-agent/docs/containerization.md](packages/coding-agent/docs/containerization.md) para tres patrones:

- **OpenShell**: ejecuta todo el proceso en un sandbox controlado por políticas.
- **Extensión Gondolin**: mantiene IROPI y la autenticación del proveedor en el host mientras enruta las herramientas integradas y los comandos `!` hacia una micro-VM local de Linux.
- **Docker simple**: ejecuta todo el proceso en un contenedor local para aislamiento sencillo.

## Desarrollo

```bash
npm install --ignore-scripts  # Instalar todas las dependencias sin ejecutar scripts de ciclo de vida
npm run build        # Construir todos los paquetes
npm run check        # Lint, formato y verificación de tipos
./test.sh            # Ejecutar pruebas (omite las pruebas dependientes de LLM sin claves API)
./iropi-test.sh      # Ejecutar IROPI desde el código fuente (se puede ejecutar desde cualquier directorio)
```

## Configuración

IROPI guarda su configuración en `~/.iropi/`:

```
~/.iropi/
├── agent/
│   ├── auth.json          # Claves API y autenticación
│   ├── settings.json      # Configuración general
│   ├── models.json        # Modelos disponibles
│   ├── themes/            # Temas personalizados
│   ├── sessions/          # Sesiones guardadas
│   ├── tools/             # Herramientas personalizadas
│   └── prompts/           # Plantillas de prompts
└── bin/                   # Binarios gestionados (fd, rg)
```

### Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `GEMINI_API_KEY` | API key de Google Gemini |
| `ANTHROPIC_API_KEY` | API key de Anthropic Claude |
| `OPENAI_API_KEY` | API key de OpenAI |
| `MISTRAL_API_KEY` | API key de Mistral |
| `IROPI_CODING_AGENT_DIR` | Directorio de configuración personalizado |
| `IROPI_CACHE_RETENTION` | Retención de caché: "short" o "long" |

## Contribuir

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para las guías de contribución y [AGENTS.md](AGENTS.md) para las reglas específicas del proyecto.

## Licencia

MIT — Creado por [iroennys-admin](https://github.com/iroennys-admin)

Basado en [Pi Agent Harness](https://github.com/earendil-works/pi) por Mario Zechner, publicado bajo licencia MIT.
