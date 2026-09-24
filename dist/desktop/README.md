# ILCMS Desktop (Demo Build)

> *This document was written with the assistance of AI. All code and documentation have been human-reviewed and verified.*

> **Notice:** The packages provided in this directory represent a **minimum demo version** of the ILCMS application without full functionality. They are intended for demonstration and evaluation purposes only.

For detailed project documentation, architecture overviews, and source code, please refer to the main repository [README.md](../../README.md).

---

## Prerequisites

- **Node.js:** Node.js is required to run the service. If it is not already installed on your system, download and install it from [nodejs.org](https://nodejs.org/).
- **Web Browser:** Once started, the desktop application runs a local service and opens in your web browser at:
[http://127.0.0.1:3000](http://127.0.0.1:3000)

---

## Package Overview

| File | Target Platform | Type |
| :--- | :--- | :--- |
| `ILCMS-Setup-1.0.0.msi` | Microsoft Windows | Windows Installer package |
| `ilcms_1.0.0_amd64.deb` | Debian / Ubuntu / Linux Mint | Debian binary package (amd64) |
| `ilcms-1.0.0-1.x86_64.rpm` | Fedora / RHEL / AlmaLinux / openSUSE | RPM binary package (x86_64) |
| `ILCMS-1.0.0.dmg` | macOS | Apple Disk Image installer |
| `SHA256SUMS` | All platforms | SHA-256 checksums for package integrity verification |

---

## Verification

Before installation, you can verify file integrity using the provided `SHA256SUMS` file:

- **Linux / macOS:**
```bash
sha256sum -c SHA256SUMS --ignore-missing

```

* **Windows (PowerShell):**
```powershell
Get-FileHash .\ILCMS-Setup-1.0.0.msi -Algorithm SHA256

```


*(Compare the hash output against the value listed in `SHA256SUMS`)*

---

## Installation Instructions

### Windows (`ILCMS-Setup-1.0.0.msi`)

1. Ensure **Node.js** is installed.
2. Double-click `ILCMS-Setup-1.0.0.msi` to launch the Windows Installer.
3. Follow the setup wizard prompts to finish the installation.
4. Launch the application from your Start Menu or Desktop shortcut.
5. Access the user interface by navigating to `http://127.0.0.1:3000` in your web browser (if it does not open automatically).

---

### Debian / Ubuntu (`ilcms_1.0.0_amd64.deb`)

1. Ensure **Node.js** is installed:
```bash
node -v || sudo apt update && sudo apt install -y nodejs npm

```


2. Install the package using `apt` to ensure local installation and dependency handling:
```bash
sudo apt install ./ilcms_1.0.0_amd64.deb

```


*(Alternatively, use `sudo dpkg -i ilcms_1.0.0_amd64.deb` followed by `sudo apt-get install -f`)*

3. Launch `ilcms` from your terminal or desktop application menu "/usr/local/bin/ilcms".
4. Open `http://127.0.0.1:3000` in your web browser (if it does not open automatically).

---

### Red Hat / Fedora / AlmaLinux / openSUSE (`ilcms-1.0.0-1.x86_64.rpm`)

1. Ensure **Node.js** is installed:
```bash
node -v || sudo dnf install -y nodejs

```


2. Install the RPM package using `dnf` (or `zypper` on openSUSE):
```bash
sudo dnf install ./ilcms-1.0.0-1.x86_64.rpm

```


3. Run the installed `ilcms` application "/usr/local/bin/ilcms".
4. Open `http://127.0.0.1:3000` in your web browser (if it does not open automatically).

---

### macOS (`ILCMS-1.0.0.dmg`)

1. Ensure **Node.js** is installed (via [nodejs.org](https://nodejs.org/?utm_source=gemini) or Homebrew: `brew install node`).
2. Double-click `ILCMS-1.0.0.dmg` to mount the disk image.
3. Drag the **ILCMS** application icon into your `/Applications` directory.
4. Launch **ILCMS** from your Applications folder or Spotlight.
> **Note:** On first launch, if macOS Gatekeeper blocks opening an unsigned package, open **System Settings** → **Privacy & Security** and select **Open Anyway**.


5. The application opens `http://127.0.0.1:3000` in your web browser.

```

```
