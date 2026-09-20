import { NextRequest, NextResponse } from "next/server";
import { INITIAL_AUDIT_EVENTS, AuditEvent } from "@/lib/admin-store";

let auditEvents: AuditEvent[] = [...INITIAL_AUDIT_EVENTS];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user");
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  let filtered = [...auditEvents];

  if (user && user !== "all") {
    filtered = filtered.filter((ev) => ev.userEmail.toLowerCase() === user.toLowerCase());
  }

  if (category && category !== "all") {
    filtered = filtered.filter((ev) => ev.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (ev) =>
        ev.action.toLowerCase().includes(q) ||
        ev.target.toLowerCase().includes(q) ||
        ev.details.toLowerCase().includes(q) ||
        ev.userName.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    status: "ok",
    total: filtered.length,
    events: filtered,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userName, userEmail, role, action, category, target, details, status } = body;

    const newEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: userName || "Kerfisstjóri ILCMS",
      userEmail: userEmail || "admin@ilcms.is",
      role: role || "ADMIN",
      action: action || "Óskilgreind aðgerð",
      category: category || "ADMIN",
      target: target || "ILCMS Kerfi",
      ipAddress: "127.0.0.1",
      status: status || "SUCCESS",
      details: details || "",
    };

    auditEvents = [newEvent, ...auditEvents];

    return NextResponse.json({
      success: true,
      event: newEvent,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
