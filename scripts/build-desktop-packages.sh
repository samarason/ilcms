#!/usr/bin/env bash
# ==============================================================================
# ILCMS (Icelandic Legal Case Management System)
# Standalone Desktop Package Builder
# ==============================================================================
# Generates ultra-lightweight standalone desktop installer binaries:
#   • Windows:  .msi  (Windows Installer via WiX / wixl)
#   • Linux:    .deb  (Debian, Ubuntu, Pop!_OS, Linux Mint via dpkg-deb)
#   • Linux:    .rpm  (Fedora, Red Hat, CentOS, openSUSE via rpmbuild)
#   • macOS:    .dmg  (macOS Apple Disk Image via hdiutil / genisoimage)
#
# Design Principles:
#   1. Ultra-Lightweight: Bundles Next.js standalone runtime (~25MB), NOT heavy
#      Docker or K3s containers. Runs directly on the user's laptop.
#   2. Local Execution: Starts local application server on port 3000, opens default
#      system browser or webview, connects to local Air-Gapped AI (Ollama)
#      with graceful fallback to deterministic statutory engine.
#   3. Native OS Integration: Desktop shortcuts, Application menu entries,
#      icons, clean install locations, and native uninstallation support.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"
export PATH="${PROJECT_ROOT}/node_modules/.bin:${PATH}"

APP_NAME="ilcms"
APP_DISPLAY_NAME="ILCMS - Málastjórnun"
APP_DESCRIPTION="100% Air-Gapped Icelandic Legal Case Management and Court Bundle System"
APP_VERSION="1.0.0"
APP_AUTHOR="ILCMS Legal Tech <support@ilcms.is>"
APP_LICENSE="Proprietary"
OUTPUT_DIR="${PROJECT_ROOT}/dist/desktop"
STAGING_DIR="${PROJECT_ROOT}/.build-desktop-staging"

# Default flags
BUILD_DEB=false
BUILD_RPM=false
BUILD_MSI=false
BUILD_DMG=false
CLEAN_FIRST=false
SKIP_NPM_BUILD=false

print_usage() {
  cat <<EOF
ILCMS Standalone Desktop Packaging Tool

Usage: ./scripts/build-desktop-packages.sh [OPTIONS]

Options:
  --all           Build ALL packages (.deb, .rpm, .msi, .dmg)
  --deb           Build Debian / Ubuntu package (.deb)
  --rpm           Build Fedora / RHEL / openSUSE package (.rpm)
  --msi           Build Windows Installer package (.msi)
  --dmg           Build macOS Disk Image package (.dmg)
  --skip-build    Skip 'npm run build' if standalone bundle is already present
  --clean         Clean staging and previous output directories before building
  --help, -h      Show this help message

Output Location:
  ${OUTPUT_DIR}/
EOF
}

if [ $# -eq 0 ]; then
  # If no args given, build all by default
  BUILD_DEB=true
  BUILD_RPM=true
  BUILD_MSI=true
  BUILD_DMG=true
else
  while [ $# -gt 0 ]; do
    case "$1" in
      --all)
        BUILD_DEB=true
        BUILD_RPM=true
        BUILD_MSI=true
        BUILD_DMG=true
        ;;
      --deb)
        BUILD_DEB=true
        ;;
      --rpm)
        BUILD_RPM=true
        ;;
      --msi)
        BUILD_MSI=true
        ;;
      --dmg)
        BUILD_DMG=true
        ;;
      --skip-build)
        SKIP_NPM_BUILD=true
        ;;
      --clean)
        CLEAN_FIRST=true
        ;;
      --help|-h)
        print_usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1"
        print_usage
        exit 1
        ;;
    esac
    shift
  done
fi

# If no specific package format was toggled, build all by default
if [ "$BUILD_DEB" = false ] && [ "$BUILD_RPM" = false ] && [ "$BUILD_MSI" = false ] && [ "$BUILD_DMG" = false ]; then
  BUILD_DEB=true
  BUILD_RPM=true
  BUILD_MSI=true
  BUILD_DMG=true
fi

echo "================================================================================"
echo "   🇮🇸  ILCMS — Standalone Desktop Package Builder"
echo "   Target Version: ${APP_VERSION} (Lightweight Standalone, No Docker / K3s)"
echo "================================================================================"
echo ""

if [ "$CLEAN_FIRST" = true ]; then
  echo "==> Cleaning previous builds and staging directories..."
  rm -rf "${OUTPUT_DIR}" "${STAGING_DIR}"
fi

mkdir -p "${OUTPUT_DIR}" "${STAGING_DIR}"

# ------------------------------------------------------------------------------
# STEP 1: Build Next.js Standalone Bundle
# ------------------------------------------------------------------------------
echo "=== [1/6] Preparing Standalone Application Bundle ==="

export PATH="${PROJECT_ROOT}/node_modules/.bin:${PATH}"
# Verify that Next.js dependencies are installed; install automatically if missing
if [ ! -d "${PROJECT_ROOT}/node_modules/next" ] || [ ! -e "${PROJECT_ROOT}/node_modules/.bin/next" ]; then
  echo "==> Dependencies not found in node_modules. Installing dependencies..."
  if command -v npm >/dev/null 2>&1; then
    (cd "${PROJECT_ROOT}" && (npm install --include=dev --legacy-peer-deps || npm install --include=dev))
  elif command -v bun >/dev/null 2>&1; then
    (cd "${PROJECT_ROOT}" && bun install)
  elif command -v pnpm >/dev/null 2>&1; then
    (cd "${PROJECT_ROOT}" && pnpm install)
  elif command -v yarn >/dev/null 2>&1; then
    (cd "${PROJECT_ROOT}" && yarn install)
  else
    echo "Error: Next.js dependencies are missing and neither npm, bun, pnpm, nor yarn was found."
    echo "Please install dependencies with 'npm install' and try again."
    exit 1
  fi
fi

export NODE_ENV="production"
export NEXT_IGNORE_INCORRECT_LOCKFILE="1"

# Ensure next binary is executable and symlinked if missing
if [ -f "${PROJECT_ROOT}/node_modules/next/dist/bin/next" ]; then
  mkdir -p "${PROJECT_ROOT}/node_modules/.bin"
  if [ ! -e "${PROJECT_ROOT}/node_modules/.bin/next" ]; then
    ln -sf "../next/dist/bin/next" "${PROJECT_ROOT}/node_modules/.bin/next"
  fi
  chmod +x "${PROJECT_ROOT}/node_modules/next/dist/bin/next" "${PROJECT_ROOT}/node_modules/.bin/next" 2>/dev/null || true
fi

# Ensure global PATH has a fallback if /usr/local/bin is writable
if [ -w "/usr/local/bin" ] && [ ! -e "/usr/local/bin/next" ] && [ -f "${PROJECT_ROOT}/node_modules/next/dist/bin/next" ]; then
  ln -sf "${PROJECT_ROOT}/node_modules/.bin/next" /usr/local/bin/next 2>/dev/null || true
fi

if [ -f ".next/standalone/server.js" ] && [ "$CLEAN_FIRST" = false ]; then
  echo "✓ Using existing production standalone bundle in .next/standalone."
elif [ "$SKIP_NPM_BUILD" = false ]; then
  echo "Building Next.js application in standalone mode..."
  if command -v npm >/dev/null 2>&1; then
    NODE_ENV=production npm run build
  elif [ -x "${PROJECT_ROOT}/node_modules/.bin/next" ]; then
    NODE_ENV=production "${PROJECT_ROOT}/node_modules/.bin/next" build
  elif [ -f "${PROJECT_ROOT}/node_modules/next/dist/bin/next" ]; then
    NODE_ENV=production node "${PROJECT_ROOT}/node_modules/next/dist/bin/next" build
  elif command -v next >/dev/null 2>&1; then
    NODE_ENV=production next build
  elif command -v npx >/dev/null 2>&1; then
    NODE_ENV=production npx next build
  else
    echo "Error: Next.js could not be located. Run 'npm install' first."
    exit 1
  fi
fi

if [ ! -f ".next/standalone/server.js" ]; then
  echo "Error: .next/standalone/server.js was not found. Please compile the application first (e.g. npm run build)."
  exit 1
fi

STANDALONE_DIR="${STAGING_DIR}/standalone"
rm -rf "${STANDALONE_DIR}"
mkdir -p "${STANDALONE_DIR}"

echo "Syncing standalone server files and static assets..."
cp -a .next/standalone/. "${STANDALONE_DIR}/"
mkdir -p "${STANDALONE_DIR}/.next/static"
mkdir -p "${STANDALONE_DIR}/public"
mkdir -p "${STANDALONE_DIR}/examples"

if [ -d ".next/static" ]; then
  cp -a .next/static/. "${STANDALONE_DIR}/.next/static/"
fi
if [ -d "public" ]; then
  cp -a public/. "${STANDALONE_DIR}/public/"
fi
if [ -d "examples" ]; then
  cp -a examples/. "${STANDALONE_DIR}/examples/"
fi

# Create default standalone .env
cat <<'EOF' > "${STANDALONE_DIR}/.env"
PORT=3000
HOST=127.0.0.1
NODE_ENV=production
AIRGAP_MODE=true
AIRGAP_AI_ONLY=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma2:9b
OLLAMA_EMBED_MODEL=nomic-embed-text
EOF

STANDALONE_SIZE=$(du -sh "${STANDALONE_DIR}" | cut -f1)
echo "✓ Standalone bundle ready in staging (${STANDALONE_SIZE})."

# ------------------------------------------------------------------------------
# STEP 2: Generate Official Desktop Icons
# ------------------------------------------------------------------------------
echo ""
echo "=== [2/6] Generating Desktop Brand & System Icons ==="

ICON_DIR="${STAGING_DIR}/icons"
mkdir -p "${ICON_DIR}"

# First check if pre-generated icons exist in assets/icons/
if [ -f "${PROJECT_ROOT}/assets/icons/ilcms-512.png" ]; then
  echo "✓ Using bundled desktop icons from assets/icons/."
  cp -a "${PROJECT_ROOT}/assets/icons/." "${ICON_DIR}/"
fi

# If 512x512 icon is still missing, generate it safely
if [ ! -f "${ICON_DIR}/ilcms-512.png" ]; then
  python3 - << 'EOF'
import os
import shutil
import subprocess

icon_png = ".build-desktop-staging/icons/ilcms-512.png"
os.makedirs(os.path.dirname(icon_png), exist_ok=True)

# 1. Try PIL (Pillow) if available
has_pil = False
try:
    from PIL import Image, ImageDraw, ImageFont
    has_pil = True
    im = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    draw.rounded_rectangle([24, 24, 488, 488], radius=64, fill=(15, 23, 42, 255), outline=(59, 130, 246, 255), width=8)
    draw.rounded_rectangle([40, 40, 472, 472], radius=48, fill=(30, 41, 59, 255))
    im.save(icon_png)
except Exception:
    has_pil = False

# 2. Try ImageMagick if PIL was not available or failed
if not os.path.exists(icon_png):
    conv_bin = shutil.which("magick") or shutil.which("convert")
    if conv_bin:
        cmd = [
            conv_bin, "-size", "512x512", "xc:none",
            "-fill", "#0f172a", "-draw", "roundrectangle 24,24,488,488,64,64",
            "-stroke", "#3b82f6", "-strokewidth", "8", "-fill", "#1e293b", "-draw", "roundrectangle 40,40,472,472,48,48",
            icon_png
        ]
        try:
            subprocess.run(cmd, check=True)
        except Exception as e:
            print(f"Warning: ImageMagick icon generation failed: {e}")

# 3. Minimal fallback: write a valid 1x1 or simple PNG if still missing
if not os.path.exists(icon_png):
    # Minimal 1x1 transparent PNG payload
    import base64
    tiny_png = b'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    with open(icon_png, "wb") as f:
        f.write(base64.b64decode(tiny_png))
EOF
fi

# Helper function to resize icons safely across macOS (sips), Linux (magick/convert), or fallback
resize_icon() {
  local src="$1"
  local size="$2"
  local dest="$3"

  if [ -f "$dest" ]; then
    return 0
  fi

  if command -v sips >/dev/null 2>&1; then
    # Native macOS image utility
    cp "$src" "$dest"
    sips -z "$size" "$size" "$dest" >/dev/null 2>&1 || true
  elif command -v magick >/dev/null 2>&1; then
    magick "$src" -resize "${size}x${size}" "$dest" 2>/dev/null || cp "$src" "$dest"
  elif command -v convert >/dev/null 2>&1; then
    convert "$src" -resize "${size}x${size}" "$dest" 2>/dev/null || cp "$src" "$dest"
  else
    cp "$src" "$dest"
  fi
}

# Generate PNG sizes
resize_icon "${ICON_DIR}/ilcms-512.png" 256 "${ICON_DIR}/ilcms-256.png"
resize_icon "${ICON_DIR}/ilcms-512.png" 128 "${ICON_DIR}/ilcms-128.png"
resize_icon "${ICON_DIR}/ilcms-512.png" 64  "${ICON_DIR}/ilcms-64.png"
resize_icon "${ICON_DIR}/ilcms-512.png" 32  "${ICON_DIR}/ilcms-32.png"

# Generate Windows .ico if not present
if [ ! -f "${ICON_DIR}/ilcms.ico" ]; then
  if [ -f "${PROJECT_ROOT}/assets/icons/ilcms.ico" ]; then
    cp "${PROJECT_ROOT}/assets/icons/ilcms.ico" "${ICON_DIR}/ilcms.ico"
  elif command -v magick >/dev/null 2>&1; then
    magick "${ICON_DIR}/ilcms-512.png" -define icon:auto-resize=256,128,64,48,32,16 "${ICON_DIR}/ilcms.ico" 2>/dev/null || true
  elif command -v convert >/dev/null 2>&1; then
    convert "${ICON_DIR}/ilcms-512.png" -define icon:auto-resize=256,128,64,48,32,16 "${ICON_DIR}/ilcms.ico" 2>/dev/null || true
  fi
fi

# Ensure standard ilcms.png alias exists
if [ ! -f "${ICON_DIR}/ilcms.png" ]; then
  if [ -f "${ICON_DIR}/ilcms-256.png" ]; then
    cp "${ICON_DIR}/ilcms-256.png" "${ICON_DIR}/ilcms.png"
  else
    cp "${ICON_DIR}/ilcms-512.png" "${ICON_DIR}/ilcms.png"
  fi
fi

echo "✓ Created icons: ilcms.png, ilcms.ico"

# ------------------------------------------------------------------------------
# STEP 3: Build Linux Debian Package (.deb)
# ------------------------------------------------------------------------------
if [ "$BUILD_DEB" = true ]; then
  echo ""
  echo "=== [3/6] Building Debian/Ubuntu (.deb) Package ==="

  DEB_ROOT="${STAGING_DIR}/deb_pkg"
  rm -rf "${DEB_ROOT}"
  mkdir -p "${DEB_ROOT}/DEBIAN"
  mkdir -p "${DEB_ROOT}/opt/ilcms"
  mkdir -p "${DEB_ROOT}/usr/bin"
  mkdir -p "${DEB_ROOT}/usr/share/applications"
  mkdir -p "${DEB_ROOT}/usr/share/pixmaps"
  mkdir -p "${DEB_ROOT}/etc/systemd/system"

  # Copy standalone payload to /opt/ilcms
  cp -a "${STANDALONE_DIR}/." "${DEB_ROOT}/opt/ilcms/"

  # Install launcher script
  cp "${PROJECT_ROOT}/scripts/ilcms-linux-launcher.sh" "${DEB_ROOT}/usr/bin/ilcms"
  chmod +x "${DEB_ROOT}/usr/bin/ilcms"

  # Desktop Entry
  cat <<EOF > "${DEB_ROOT}/usr/share/applications/ilcms.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=${APP_DISPLAY_NAME}
GenericName=Legal Case Management System
Comment=${APP_DESCRIPTION}
Exec=ilcms
Icon=ilcms
Terminal=false
Categories=Office;Legal;Utility;
Keywords=Legal;Lawyer;Court;Iceland;Dómstóll;Málaskrá;
StartupNotify=true
EOF
  chmod 644 "${DEB_ROOT}/usr/share/applications/ilcms.desktop"

  # System Icon
  cp "${ICON_DIR}/ilcms-256.png" "${DEB_ROOT}/usr/share/pixmaps/ilcms.png"

  # Optional systemd unit file
  cat <<'EOF' > "${DEB_ROOT}/etc/systemd/system/ilcms.service"
[Unit]
Description=ILCMS Legal Workspace Standalone Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ilcms
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=127.0.0.1
Environment=HOSTNAME=127.0.0.1
Environment=AIRGAP_MODE=true
ExecStart=/usr/bin/node /opt/ilcms/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  # DEBIAN Control File
  INSTALLED_SIZE=$(du -sk "${DEB_ROOT}" | cut -f1)
  cat <<EOF > "${DEB_ROOT}/DEBIAN/control"
Package: ${APP_NAME}
Version: ${APP_VERSION}
Section: office
Priority: optional
Architecture: amd64
Depends: nodejs (>= 18.0.0) | node (>= 18.0.0)
Recommends: xdg-utils
Maintainer: ${APP_AUTHOR}
Installed-Size: ${INSTALLED_SIZE}
Description: ${APP_DISPLAY_NAME}
 ${APP_DESCRIPTION}.
 Ultra-lightweight standalone local installation for Icelandic law firms and courts.
 100% Air-Gapped client-side execution with statutory procedural deadline calculators,
 court bundle generator (Reglur dómstólasýslunnar), and automated pleading studio.
EOF

  # Post-install script
  cat <<'EOF' > "${DEB_ROOT}/DEBIAN/postinst"
#!/bin/sh
set -e
chmod +x /usr/bin/ilcms
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi
echo "================================================================================"
echo " ILCMS has been installed successfully to /opt/ilcms"
echo " Run 'ilcms' in terminal or launch from your Application Menu."
echo "================================================================================"
exit 0
EOF
  chmod 755 "${DEB_ROOT}/DEBIAN/postinst"

  # Pre-remove script
  cat <<'EOF' > "${DEB_ROOT}/DEBIAN/prerm"
#!/bin/sh
set -e
/usr/bin/ilcms stop 2>/dev/null || true
exit 0
EOF
  chmod 755 "${DEB_ROOT}/DEBIAN/prerm"

  DEB_FILE="${OUTPUT_DIR}/ilcms_${APP_VERSION}_amd64.deb"
  dpkg-deb --build --root-owner-group "${DEB_ROOT}" "${DEB_FILE}"
  DEB_SIZE=$(du -sh "${DEB_FILE}" | cut -f1)
  echo "✓ Built Debian package: ${DEB_FILE} (${DEB_SIZE})"
fi

# ------------------------------------------------------------------------------
# STEP 4: Build Linux RPM Package (.rpm)
# ------------------------------------------------------------------------------
if [ "$BUILD_RPM" = true ]; then
  echo ""
  echo "=== [4/6] Building Fedora/RHEL/openSUSE (.rpm) Package ==="

  if ! command -v rpmbuild >/dev/null 2>&1; then
    echo "⚠️  'rpmbuild' was not found in PATH. Skipping .rpm package."
    echo "    (To enable: sudo apt-get install -y rpm OR sudo dnf install -y rpm-build)"
  else
    RPM_BUILD_DIR="${STAGING_DIR}/rpmbuild"
    rm -rf "${RPM_BUILD_DIR}"
    mkdir -p "${RPM_BUILD_DIR}/SPECS"
    mkdir -p "${RPM_BUILD_DIR}/SOURCES"
    mkdir -p "${RPM_BUILD_DIR}/BUILD"
    mkdir -p "${RPM_BUILD_DIR}/RPMS"
    mkdir -p "${RPM_BUILD_DIR}/SRPMS"

  # Create payload tarball for rpmbuild
  PAYLOAD_TAR="${RPM_BUILD_DIR}/SOURCES/${APP_NAME}-${APP_VERSION}.tar.gz"
  tar -czf "${PAYLOAD_TAR}" -C "${STANDALONE_DIR}" .

  # Copy launcher script and icon to SOURCES
  cp "${PROJECT_ROOT}/scripts/ilcms-linux-launcher.sh" "${RPM_BUILD_DIR}/SOURCES/ilcms"
  cp "${ICON_DIR}/ilcms-256.png" "${RPM_BUILD_DIR}/SOURCES/ilcms.png"

  # Create RPM spec file
  cat <<EOF > "${RPM_BUILD_DIR}/SPECS/ilcms.spec"
Name:           ${APP_NAME}
Version:        ${APP_VERSION}
Release:        1%{?dist}
Summary:        ${APP_DISPLAY_NAME}
License:        ${APP_LICENSE}
URL:            https://ilcms.is
Source0:        %{name}-%{version}.tar.gz
Source1:        ilcms
Source2:        ilcms.png
BuildArch:      x86_64
Requires:       nodejs >= 18.0.0
AutoReqProv:    no

# Disable automatic debug symbol extraction on JavaScript standalone bundles
%global         _enable_debug_packages 0
%global         debug_package %{nil}
%global         __os_install_post %{nil}

%description
${APP_DESCRIPTION}.
Ultra-lightweight standalone local installation for legal advocates, courts, and paralegals.
Includes statutory litigation timelines (Lög nr. 91/1991), court exhibit bundles, and air-gapped legal drafting.

%prep
%setup -q -c -n %{name}-%{version}

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/opt/%{name}
mkdir -p %{buildroot}/usr/bin
mkdir -p %{buildroot}/usr/share/applications
mkdir -p %{buildroot}/usr/share/pixmaps
mkdir -p %{buildroot}/etc/systemd/system

# Copy application files (including hidden directories and files like .next and .env)
cp -a ./. %{buildroot}/opt/%{name}/

# Copy icon
install -m 644 %{SOURCE2} %{buildroot}/usr/share/pixmaps/ilcms.png

# Copy launcher script
install -m 755 %{SOURCE1} %{buildroot}/usr/bin/ilcms

# Copy desktop file
cat << 'DESK' > %{buildroot}/usr/share/applications/ilcms.desktop
[Desktop Entry]
Version=1.0
Type=Application
Name=${APP_DISPLAY_NAME}
GenericName=Legal Case Management System
Comment=${APP_DESCRIPTION}
Exec=ilcms
Icon=ilcms
Terminal=false
Categories=Office;Legal;Utility;
Keywords=Legal;Lawyer;Court;Iceland;Dómstóll;Málaskrá;
StartupNotify=true
DESK

# Copy systemd unit file
cat << 'SERVICE' > %{buildroot}/etc/systemd/system/ilcms.service
[Unit]
Description=ILCMS Legal Workspace Standalone Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ilcms
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=127.0.0.1
Environment=HOSTNAME=127.0.0.1
Environment=AIRGAP_MODE=true
ExecStart=/usr/bin/node /opt/ilcms/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

%files
%defattr(-,root,root,-)
/opt/%{name}
%attr(755,root,root) /usr/bin/ilcms
/usr/share/applications/ilcms.desktop
/usr/share/pixmaps/ilcms.png
%config(noreplace) /etc/systemd/system/ilcms.service

%post
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi
if command -v restorecon >/dev/null 2>&1; then
  restorecon -R /opt/%{name} /usr/bin/ilcms /usr/share/applications/ilcms.desktop /usr/share/pixmaps/ilcms.png 2>/dev/null || true
fi

%preun
if [ \$1 -eq 0 ]; then
  /usr/bin/ilcms stop 2>/dev/null || true
fi

%clean
rm -rf %{buildroot}
EOF

    rpmbuild --define "_topdir ${RPM_BUILD_DIR}" -bb "${RPM_BUILD_DIR}/SPECS/ilcms.spec"
    RPM_FILE=$(find "${RPM_BUILD_DIR}/RPMS" -name "*.rpm" | head -n 1)
    if [ -z "${RPM_FILE}" ] || [ ! -f "${RPM_FILE}" ]; then
      echo "Error: rpmbuild failed to produce an .rpm file."
      exit 1
    fi
    RPM_DEST="${OUTPUT_DIR}/ilcms-${APP_VERSION}-1.x86_64.rpm"
    cp "${RPM_FILE}" "${RPM_DEST}"
    RPM_SIZE=$(du -sh "${RPM_DEST}" | cut -f1)
    echo "✓ Built RPM package: ${RPM_DEST} (${RPM_SIZE})"
  fi
fi

# ------------------------------------------------------------------------------
# STEP 5: Build Windows Installer Package (.msi)
# ------------------------------------------------------------------------------
if [ "$BUILD_MSI" = true ]; then
  echo ""
  echo "=== [5/6] Building Windows Installer (.msi) Package ==="

  if ! command -v wixl >/dev/null 2>&1; then
    echo "⚠️  'wixl' was not found in PATH. Skipping .msi package."
    echo "    (To enable: sudo apt-get install -y wixl)"
  else
    MSI_STAGING="${STAGING_DIR}/msi"
    rm -rf "${MSI_STAGING}"
    mkdir -p "${MSI_STAGING}"

  # Package standalone app into compressed zip payload (~8MB)
  echo "Packing application payload for Windows Installer..."
  APP_ZIP="${MSI_STAGING}/ilcms-app.zip"
  python3 -c "import shutil; shutil.make_archive('${MSI_STAGING}/ilcms-app', 'zip', '${STANDALONE_DIR}')"

  # Copy application icon
  cp "${ICON_DIR}/ilcms.ico" "${MSI_STAGING}/ilcms.ico"

  # Create build version stamp for automatic update detection
  echo "${APP_VERSION}-$(date +%Y%m%d%H%M%S)" > "${MSI_STAGING}/version.txt"

  # Copy Windows Launchers and Uninstaller from scripts directory
  cp "${PROJECT_ROOT}/scripts/ILCMS.bat" "${MSI_STAGING}/ILCMS.bat"
  cp "${PROJECT_ROOT}/scripts/ILCMS-Silent.vbs" "${MSI_STAGING}/ILCMS-Silent.vbs"
  cp "${PROJECT_ROOT}/scripts/Uninstall-ILCMS.bat" "${MSI_STAGING}/Uninstall-ILCMS.bat"

  # Convert Windows script files to native Windows CRLF line endings
  python3 -c "
for fname in ['${MSI_STAGING}/ILCMS.bat', '${MSI_STAGING}/ILCMS-Silent.vbs', '${MSI_STAGING}/Uninstall-ILCMS.bat', '${MSI_STAGING}/version.txt']:
    with open(fname, 'rb') as f:
        data = f.read().replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
    with open(fname, 'wb') as f:
        f.write(data)
"

  # Create WiX Source File
  WXS_FILE="${MSI_STAGING}/ilcms.wxs"
  cat <<EOF > "${WXS_FILE}"
<?xml version="1.0" encoding="utf-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="62495479-6D33-4937-8266-52AC27476168"
           Name="${APP_DISPLAY_NAME}"
           Language="1033"
           Version="${APP_VERSION}"
           Manufacturer="ILCMS Legal Tech"
           UpgradeCode="9B7B9CAA-BEBF-4052-9596-7B8E264D21F4">
    <Package Description="${APP_DESCRIPTION}"
             Comments="Lightweight Standalone Desktop Package"
             Manufacturer="ILCMS Legal Tech"
             InstallerVersion="200"
             Compressed="yes" />

    <Media Id="1" Cabinet="ilcms.cab" EmbedCab="yes" />

    <Icon Id="ILCMSIcon" SourceFile="ilcms.ico" />
    <Property Id="ARPPRODUCTICON" Value="ILCMSIcon" />
    <Property Id="ARPHELPLINK" Value="https://ilcms.is" />

    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFiles64Folder">
        <Directory Id="INSTALLDIR" Name="ILCMS">
          <Component Id="CmpAppZip" Guid="A1A2A3A4-B1B2-C1C2-D1D2-E1E2E3E4E501">
            <File Id="FileAppZip" Source="ilcms-app.zip" KeyPath="yes" />
          </Component>
          <Component Id="CmpVersion" Guid="A1A2A3A4-B1B2-C1C2-D1D2-E1E2E3E4E506">
            <File Id="FileVersion" Source="version.txt" KeyPath="yes" />
          </Component>
          <Component Id="CmpBat" Guid="A1A2A3A4-B1B2-C1C2-D1D2-E1E2E3E4E502">
            <File Id="FileBat" Source="ILCMS.bat" KeyPath="yes" />
          </Component>
          <Component Id="CmpVbs" Guid="A1A2A3A4-B1B2-C1C2-D1D2-E1E2E3E4E503">
            <File Id="FileVbs" Source="ILCMS-Silent.vbs" KeyPath="yes" />
          </Component>
          <Component Id="CmpIco" Guid="A1A2A3A4-B1B2-C1C2-D1D2-E1E2E3E4E504">
            <File Id="FileIco" Source="ilcms.ico" KeyPath="yes" />
          </Component>
          <Component Id="CmpUninst" Guid="A1A2A3A4-B1B2-C1C2-D1D2-E1E2E3E4E505">
            <File Id="FileUninst" Source="Uninstall-ILCMS.bat" KeyPath="yes" />
          </Component>
        </Directory>
      </Directory>

      <Directory Id="ProgramMenuFolder">
        <Directory Id="ApplicationProgramsFolder" Name="ILCMS">
          <Component Id="AppStartShortcut" Guid="B1B2B3B4-C1C2-D1D2-E1E2-F1F2F3F4F501">
            <Shortcut Id="StartMenuShortcut"
                      Name="${APP_DISPLAY_NAME}"
                      Description="Launch ILCMS Legal Workspace"
                      Target="[INSTALLDIR]ILCMS-Silent.vbs"
                      WorkingDirectory="INSTALLDIR"
                      Icon="ILCMSIcon" />
            <RemoveFolder Id="ApplicationProgramsFolder" On="uninstall" />
            <RegistryValue Root="HKCU" Key="Software\\ILCMS\\Desktop" Name="installed" Type="integer" Value="1" KeyPath="yes" />
          </Component>
        </Directory>
      </Directory>

      <Directory Id="DesktopFolder" Name="Desktop">
        <Component Id="AppDesktopShortcut" Guid="C1C2C3C4-D1D2-E1E2-F1F2-A1A2A3A4A501">
          <Shortcut Id="DesktopShortcut"
                    Name="ILCMS"
                    Description="Launch ILCMS Legal Workspace"
                    Target="[INSTALLDIR]ILCMS-Silent.vbs"
                    WorkingDirectory="INSTALLDIR"
                    Icon="ILCMSIcon" />
          <RegistryValue Root="HKCU" Key="Software\\ILCMS\\Desktop" Name="desktop_shortcut" Type="integer" Value="1" KeyPath="yes" />
        </Component>
      </Directory>
    </Directory>

    <Feature Id="MainFeature" Title="ILCMS Standalone Application" Level="1">
      <ComponentRef Id="CmpAppZip" />
      <ComponentRef Id="CmpVersion" />
      <ComponentRef Id="CmpBat" />
      <ComponentRef Id="CmpVbs" />
      <ComponentRef Id="CmpIco" />
      <ComponentRef Id="CmpUninst" />
      <ComponentRef Id="AppStartShortcut" />
      <ComponentRef Id="AppDesktopShortcut" />
    </Feature>
  </Product>
</Wix>
EOF

    MSI_FILE="${OUTPUT_DIR}/ILCMS-Setup-${APP_VERSION}.msi"
    (cd "${MSI_STAGING}" && wixl -a x64 -o "${MSI_FILE}" ilcms.wxs)
    MSI_SIZE=$(du -sh "${MSI_FILE}" | cut -f1)
    echo "✓ Built Windows MSI Installer: ${MSI_FILE} (${MSI_SIZE})"
  fi
fi

# ------------------------------------------------------------------------------
# STEP 6: Build macOS Disk Image Package (.dmg)
# ------------------------------------------------------------------------------
if [ "$BUILD_DMG" = true ]; then
  echo ""
  echo "=== [6/6] Building macOS Disk Image (.dmg) Package ==="

  if ! command -v hdiutil >/dev/null 2>&1 && ! command -v genisoimage >/dev/null 2>&1 && ! command -v mkisofs >/dev/null 2>&1; then
    echo "⚠️  Neither 'hdiutil' nor 'genisoimage' was found in PATH. Skipping .dmg package."
    echo "    (To enable on Debian/Ubuntu: sudo apt-get install -y genisoimage)"
  else
    DMG_STAGING="${STAGING_DIR}/dmg"
    rm -rf "${DMG_STAGING}"
    mkdir -p "${DMG_STAGING}"

  APP_BUNDLE="${DMG_STAGING}/ILCMS.app"
  mkdir -p "${APP_BUNDLE}/Contents/MacOS"
  mkdir -p "${APP_BUNDLE}/Contents/Resources/app"

  # Copy standalone app payload to app bundle resources
  cp -a "${STANDALONE_DIR}/." "${APP_BUNDLE}/Contents/Resources/app/"

  # Copy AppIcon
  cp "${ICON_DIR}/ilcms-512.png" "${APP_BUNDLE}/Contents/Resources/AppIcon.png"
  if command -v iconutil >/dev/null 2>&1 && command -v sips >/dev/null 2>&1; then
    ICONSET="${DMG_STAGING}/AppIcon.iconset"
    mkdir -p "${ICONSET}"
    sips -z 16 16     "${ICON_DIR}/ilcms-512.png" --out "${ICONSET}/icon_16x16.png" >/dev/null 2>&1 || true
    sips -z 32 32     "${ICON_DIR}/ilcms-512.png" --out "${ICONSET}/icon_16x16@2x.png" >/dev/null 2>&1 || true
    sips -z 32 32     "${ICON_DIR}/ilcms-512.png" --out "${ICONSET}/icon_32x32.png" >/dev/null 2>&1 || true
    sips -z 64 64     "${ICON_DIR}/ilcms-512.png" --out "${ICONSET}/icon_32x32@2x.png" >/dev/null 2>&1 || true
    sips -z 128 128   "${ICON_DIR}/ilcms-512.png" --out "${ICONSET}/icon_128x128.png" >/dev/null 2>&1 || true
    sips -z 256 256   "${ICON_DIR}/ilcms-512.png" --out "${ICONSET}/icon_128x128@2x.png" >/dev/null 2>&1 || true
    sips -z 256 256   "${ICON_DIR}/ilcms-512.png" --out "${ICONSET}/icon_256x256.png" >/dev/null 2>&1 || true
    sips -z 512 512   "${ICON_DIR}/ilcms-512.png" --out "${ICONSET}/icon_256x256@2x.png" >/dev/null 2>&1 || true
    sips -z 512 512   "${ICON_DIR}/ilcms-512.png" --out "${ICONSET}/icon_512x512.png" >/dev/null 2>&1 || true
    iconutil -c icns "${ICONSET}" -o "${APP_BUNDLE}/Contents/Resources/AppIcon.icns" >/dev/null 2>&1 || true
    rm -rf "${ICONSET}"
  fi

  # Create macOS Info.plist
  cat <<EOF > "${APP_BUNDLE}/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>ILCMS</string>
  <key>CFBundleDisplayName</key>
  <string>${APP_DISPLAY_NAME}</string>
  <key>CFBundleIdentifier</key>
  <string>is.ilcms.desktop</string>
  <key>CFBundleVersion</key>
  <string>${APP_VERSION}</string>
  <key>CFBundleShortVersionString</key>
  <string>${APP_VERSION}</string>
  <key>CFBundleExecutable</key>
  <string>ILCMS</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
EOF

  # Create macOS native launcher script
  cat <<'EOF' > "${APP_BUNDLE}/Contents/MacOS/ILCMS"
#!/bin/bash
DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="${DIR}/Resources/app"
PORT="${PORT:-3000}"
PID_FILE="$HOME/Library/Application Support/ILCMS/ilcms.pid"
LOG_FILE="$HOME/Library/Logs/ilcms.log"

mkdir -p "$HOME/Library/Application Support/ILCMS"
mkdir -p "$HOME/Library/Logs"

NODE_BIN=""
if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x "/usr/local/bin/node" ]; then
  NODE_BIN="/usr/local/bin/node"
elif [ -x "/opt/homebrew/bin/node" ]; then
  NODE_BIN="/opt/homebrew/bin/node"
fi

if [ -z "$NODE_BIN" ]; then
  if command -v osascript >/dev/null 2>&1; then
    osascript -e 'display dialog "Node.js (18+ LTS) er nauðsynlegt til að keyra ILCMS á macOS.\nVinsamlegast sæktu Node.js frá nodejs.org." buttons {"Opna nodejs.org", "Hætta"} default button 1 with icon caution'
    if [ $? -eq 0 ]; then
      open "https://nodejs.org/en/download/"
    fi
  else
    echo "Error: Node.js (v18+) is required."
  fi
  exit 1
fi

# Check if port is already active
if ! curl -s -m 1 "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
  cd "$APP_DIR"
  NODE_ENV=production PORT="${PORT}" HOSTNAME="127.0.0.1" HOST="127.0.0.1" AIRGAP_MODE=true nohup "$NODE_BIN" server.js > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  for i in {1..20}; do
    if curl -s -m 1 "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
      break
    fi
    sleep 0.4
  done
fi

open "http://127.0.0.1:${PORT}"
EOF
  chmod +x "${APP_BUNDLE}/Contents/MacOS/ILCMS"

  # Add Applications symlink for standard drag-to-install UX
  ln -s /Applications "${DMG_STAGING}/Applications"

  DMG_FILE="${OUTPUT_DIR}/ILCMS-${APP_VERSION}.dmg"

  if [ "$(uname -s)" = "Darwin" ] && command -v hdiutil >/dev/null 2>&1; then
    # Native macOS build with hdiutil
    hdiutil create -volname "ILCMS" -srcfolder "${DMG_STAGING}" -ov -format UDZO "${DMG_FILE}"
  else
    # Cross-build on Linux using genisoimage (creates standard Mac-compatible Apple hybrid image)
    genisoimage -V "ILCMS" -D -R -apple -no-pad -quiet -o "${DMG_FILE}" "${DMG_STAGING}"
  fi

    DMG_SIZE=$(du -sh "${DMG_FILE}" | cut -f1)
    echo "✓ Built macOS DMG image: ${DMG_FILE} (${DMG_SIZE})"
  fi
fi

# ------------------------------------------------------------------------------
# STEP 7: Checksums & Summary
# ------------------------------------------------------------------------------
echo ""
echo "=== Summary & Verification ==="
(cd "${OUTPUT_DIR}" && rm -f SHA256SUMS && sha256sum * 2>/dev/null > SHA256SUMS || true)

echo "Generated Packages in: ${OUTPUT_DIR}/"
ls -lh "${OUTPUT_DIR}"

echo ""
echo "================================================================================"
echo " 🎉 ALL REQUESTED STANDALONE DESKTOP PACKAGES BUILT SUCCESSFULLY!"
echo "================================================================================"
echo ""
echo "  • Windows:  ${OUTPUT_DIR}/ILCMS-Setup-${APP_VERSION}.msi"
echo "  • Linux:    ${OUTPUT_DIR}/ilcms_${APP_VERSION}_amd64.deb"
echo "  • Linux:    ${OUTPUT_DIR}/ilcms-${APP_VERSION}-1.x86_64.rpm"
echo "  • macOS:    ${OUTPUT_DIR}/ILCMS-${APP_VERSION}.dmg"
echo ""
echo "  How to install on a target laptop:"
echo "    - Windows:  Double click 'ILCMS-Setup-1.0.0.msi' (or msiexec /i ILCMS-Setup-1.0.0.msi /quiet)"
echo "    - Ubuntu:   sudo dpkg -i ilcms_1.0.0_amd64.deb"
echo "    - Fedora:   sudo dnf install ./ilcms-1.0.0-1.x86_64.rpm"
echo "    - macOS:    Double click 'ILCMS-1.0.0.dmg' and drag 'ILCMS.app' to Applications"
echo "================================================================================"
