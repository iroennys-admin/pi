#!/usr/bin/env bash
# =============================================================================
# IROPI - Script de Instalación
# Agente de codificación AI avanzado con herramientas de web scraping
# Creado por iroennys-admin
# =============================================================================
set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Versión
VERSION="0.79.1"
PACKAGE_NAME="@iroennys/iropi-coding-agent"
REPO_URL="https://github.com/iroennys-admin/pi"

# Funciones de utilidad
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Banner
echo -e "${CYAN}${BOLD}"
echo "  ___ ____  ____  ____  ____  ____ "
echo " |_ _|  _ \|  _ \/ ___|| __ )| __ )"
echo "  | || |_) | |_) \___ \|  _ \|  _ \ "
echo "  | ||  _ <|  __/ ___) | |_) | |_) |"
echo " |___|_| \_\_|   |____/|____/|____/ "
echo ""
echo -e "${NC}"
echo -e "${BOLD}  Agente de Codificación AI Avanzado${NC}"
echo -e "  v${VERSION} - Creado por iroennys-admin"
echo -e "  ${CYAN}${REPO_URL}${NC}"
echo ""

# Verificar Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        error "Node.js no está instalado. Instálalo desde https://nodejs.org (v22+ requerido)"
    fi

    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 22 ]; then
        error "Node.js v22+ es requerido. Versión actual: $(node -v)"
    fi
    success "Node.js $(node -v) detectado"
}

# Verificar npm
check_npm() {
    if ! command -v npm &> /dev/null; then
        error "npm no está instalado"
    fi
    success "npm $(npm -v) detectado"
}

# Detectar gestor de paquetes
detect_pkg_manager() {
    if command -v bun &> /dev/null; then
        echo "bun"
    elif command -v pnpm &> /dev/null; then
        echo "pnpm"
    elif command -v yarn &> /dev/null; then
        echo "yarn"
    else
        echo "npm"
    fi
}

# Instalación global via npm
install_npm() {
    info "Instalando IROPI globalmente con npm..."
    npm install -g "$PACKAGE_NAME" --ignore-scripts 2>&1 || {
        warn "Instalación global falló, intentando con sudo..."
        sudo npm install -g "$PACKAGE_NAME" --ignore-scripts 2>&1 || error "Falló la instalación con npm"
    }
    success "IROPI instalado con npm"
}

# Instalación global via bun
install_bun() {
    info "Instalando IROPI globalmente con Bun..."
    bun install -g "$PACKAGE_NAME" --ignore-scripts 2>&1 || error "Falló la instalación con Bun"
    success "IROPI instalado con Bun"
}

# Instalación global via pnpm
install_pnpm() {
    info "Instalando IROPI globalmente con pnpm..."
    pnpm install -g "$PACKAGE_NAME" --ignore-scripts 2>&1 || error "Falló la instalación con pnpm"
    success "IROPI instalado con pnpm"
}

# Instalación global via yarn
install_yarn() {
    info "Instalando IROPI globalmente con Yarn..."
    yarn global add "$PACKAGE_NAME" --ignore-scripts 2>&1 || error "Falló la instalación con Yarn"
    success "IROPI instalado con Yarn"
}

# Instalación desde fuente
install_from_source() {
    info "Instalando IROPI desde el código fuente..."

    # Clonar repositorio
    TEMP_DIR=$(mktemp -d)
    info "Clonando repositorio en $TEMP_DIR..."
    git clone "$REPO_URL" "$TEMP_DIR/iropi" 2>&1 || error "Falló al clonar el repositorio"
    cd "$TEMP_DIR/iropi"

    # Instalar dependencias
    info "Instalando dependencias..."
    npm install --ignore-scripts 2>&1 || error "Falló al instalar dependencias"

    # Construir todos los paquetes
    info "Construyendo IROPI (esto puede tardar un momento)..."
    npm run build 2>&1 || error "Falló al construir IROPI"

    # Enlazar globalmente
    info "Enlazando IROPI globalmente..."
    cd packages/coding-agent
    npm link 2>&1 || error "Falló al enlazar IROPI"

    # Limpiar
    cd /
    rm -rf "$TEMP_DIR"
    success "IROPI instalado desde fuente"
}

# Verificar instalación
verify_installation() {
    if command -v iropi &> /dev/null; then
        INSTALLED_VERSION=$(iropi --version 2>/dev/null || echo "desconocida")
        echo ""
        success "¡IROPI v${INSTALLED_VERSION} se instaló correctamente!"
        echo ""
        echo -e "${BOLD}Comandos útiles:${NC}"
        echo -e "  ${CYAN}iropi${NC}              - Iniciar modo interactivo"
        echo -e "  ${CYAN}iropi --help${NC}        - Ver ayuda completa"
        echo -e "  ${CYAN}iropi --list-models${NC} - Listar modelos disponibles"
        echo -e "  ${CYAN}iropi -p \"prompt\"${NC}   - Ejecutar un prompt directo"
        echo ""
        echo -e "${BOLD}Herramientas incluidas:${NC}"
        echo -e "  ${GREEN}read${NC}        - Leer archivos"
        echo -e "  ${GREEN}bash${NC}        - Ejecutar comandos"
        echo -e "  ${GREEN}edit${NC}        - Editar archivos"
        echo -e "  ${GREEN}write${NC}       - Escribir archivos"
        echo -e "  ${GREEN}grep${NC}        - Buscar en archivos"
        echo -e "  ${GREEN}find${NC}        - Buscar archivos"
        echo -e "  ${GREEN}ls${NC}          - Listar directorios"
        echo -e "  ${GREEN}web_fetch${NC}   - Obtener contenido web"
        echo -e "  ${GREEN}web_scrape${NC}  - Extraer datos de páginas web"
        echo -e "  ${GREEN}web_search${NC}  - Buscar en internet"
        echo ""
        echo -e "${BOLD}Primeros pasos:${NC}"
        echo -e "  ${CYAN}1.${NC} Configura tu API key: export GEMINI_API_KEY=tu_key"
        echo -e "  ${CYAN}2.${NC} Ejecuta: ${CYAN}iropi${NC}"
        echo -e "  ${CYAN}3.${NC} ¡Empieza a programar con IA!"
        echo ""
    else
        error "La instalación falló. 'iropi' no se encuentra en el PATH."
    fi
}

# Menú principal
main() {
    # Si se pasa --source, instalar desde fuente
    if [ "${1:-}" = "--source" ]; then
        check_node
        check_npm
        install_from_source
        verify_installation
        exit 0
    fi

    # Si se pasa --uninstall, desinstalar
    if [ "${1:-}" = "--uninstall" ]; then
        info "Desinstalando IROPI..."
        PKG_MGR=$(detect_pkg_manager)
        case $PKG_MGR in
            bun)  bun remove -g "$PACKAGE_NAME" 2>&1 || warn "No se pudo desinstalar con bun" ;;
            pnpm) pnpm remove -g "$PACKAGE_NAME" 2>&1 || warn "No se pudo desinstalar con pnpm" ;;
            yarn) yarn global remove "$PACKAGE_NAME" 2>&1 || warn "No se pudo desinstalar con yarn" ;;
            npm)  npm uninstall -g "$PACKAGE_NAME" 2>&1 || warn "No se pudo desinstalar con npm" ;;
        esac
        success "IROPI desinstalado"
        exit 0
    fi

    # Verificar prerrequisitos
    check_node
    check_npm

    # Detectar gestor de paquetes
    PKG_MGR=$(detect_pkg_manager)
    info "Gestor de paquetes detectado: ${PKG_MGR}"

    # Instalar
    case $PKG_MGR in
        bun)   install_bun ;;
        pnpm)  install_pnpm ;;
        yarn)  install_yarn ;;
        npm)   install_npm ;;
        *)     install_npm ;;
    esac

    # Verificar
    verify_installation
}

main "$@"
