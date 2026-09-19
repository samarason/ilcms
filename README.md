# ILCMS — Icelandic Legal Case Management System

A dedicated legal case management and court filing system tailored for Icelandic civil litigation (*einkamálalög nr. 91/1991*), court exhibits (*dómaskjalaskrá og málsgagnasöfn*), statutory deadline tracking, and legal document drafting.

## Air-Gapped AI Security Posture

- **Requirement:** **Only the AI part of the system needs to be 100% Air-Gapped.**
- **Zero Cloud Egress:** All legal briefs, pleadings, discovery items, and client records are processed on-device. No confidential case data ever reaches third-party public cloud AI providers (OpenAI, Gemini public cloud, etc.).
- **Local Legal LLM:** Powered by Ollama hosting a fine-tuned **Gemma 2 9B** model (Icelandic legal vocabulary, 256k-token SentencePiece tokenizer) and **nomic-embed-text** for 768-dimensional local vector embeddings.
- **Network Isolation:** The AI inference container binds strictly to `127.0.0.1:11434` or runs on an internal Docker network with `internal: true`, blocking all outbound WAN traffic.

---

## One-Step Installation on Local Laptop

Run the one-step installer directly from the project root:

```bash
chmod +x install.sh
./install.sh
```

### Installation Options
- `./install.sh` : Standard one-step installation (checks RAM, sets up local isolated AI container, installs packages, and prepares the app).
- `./install.sh --docker` : One-step deployment of the full stack via Docker Compose.
- `./install.sh --ai-only` : Setup and model cache pull for the air-gapped AI subsystem only.

Once installed, access the application at:
- **Web Application:** `http://localhost:3000`
- **Air-Gapped AI Service:** `http://127.0.0.1:11434` (Strict loopback / Zero egress)

---

## Development

```bash
npm run dev
```

To run a production build:
```bash
npm run build
npm run start
```
