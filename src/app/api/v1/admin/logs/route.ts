import { NextRequest, NextResponse } from "next/server";
import { INITIAL_LOGS, SystemLogEntry } from "@/lib/admin-store";

let systemLogs: SystemLogEntry[] = [...INITIAL_LOGS];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const service = searchParams.get("service");
  const level = searchParams.get("level");
  const search = searchParams.get("search");

  let filtered = [...systemLogs];

  if (service && service !== "all") {
    filtered = filtered.filter((l) => l.service === service);
  }

  if (level && level !== "all") {
    filtered = filtered.filter((l) => l.level === level);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((l) => l.message.toLowerCase().includes(q));
  }

  return NextResponse.json({
    status: "ok",
    total: filtered.length,
    logs: filtered,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { service, level, message } = body;

    const newLog: SystemLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      service: service || "ilcms-web",
      level: level || "INFO",
      message: message || "System heartbeat normal.",
    };

    systemLogs = [newLog, ...systemLogs];

    return NextResponse.json({
      success: true,
      log: newLog,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
