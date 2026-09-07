import { NextResponse } from "next/server";
import { ollama } from "@/lib/ollama";

async function checkKeycloakHealth(url: string): Promise<{ connected: boolean; status?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${url}/health/ready`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return { connected: res.ok, status: res.ok ? "UP" : `HTTP ${res.status}` };
  } catch {
    return { connected: false, status: "UNREACHABLE_OR_LOCAL_K3S" };
  }
}

export async function GET() {
  const ollamaHealth = await ollama.checkHealth();
  const isAirgapped = process.env.AIRGAP_MODE !== "false";
  const keycloakUrl = process.env.KEYCLOAK_URL || "http://keycloak:8080";
  const keycloakHealth = await checkKeycloakHealth(keycloakUrl);

  return NextResponse.json({
    status: "ok",
    airgap_mode: isAirgapped,
    runtime_environment: "Air-Gapped Linux Host / K3s",
    database: {
      pgvector_enabled: true,
      database_url_configured: !!process.env.DATABASE_URL,
    },
    keycloak: {
      url: keycloakUrl,
      realm: process.env.KEYCLOAK_REALM || "ilcms",
      client_id: process.env.KEYCLOAK_CLIENT_ID || "ilcms-web",
      connected: keycloakHealth.connected,
      status: keycloakHealth.status,
    },
    ollama: {
      base_url: ollama.getBaseUrl(),
      default_model: ollama.getDefaultModel(),
      icelandic_model_profile: "Gemma 2 9B / Miðeind Fine-Tune (Optimized for Icelandic Legal Texts)",
      connected: ollamaHealth.healthy,
      available_models: ollamaHealth.models,
      error: ollamaHealth.error,
    },
    specs_target: {
      target_host: "Linux Laptop (20GB RAM, 300GB SSD)",
      ollama_ram_allocation: "6-8 GB",
      keycloak_ram_allocation: "512MB-1 GB",
      postgres_pgvector_ram_allocation: "1-2 GB",
      app_ram_allocation: "512MB-1.5 GB",
      free_ram_buffer: "6-8 GB",
    },
  });
}
