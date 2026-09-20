import { NextRequest, NextResponse } from "next/server";
import { INITIAL_SERVICES, INITIAL_RESOURCES, SystemService, SystemResources } from "@/lib/admin-store";

// In-memory runtime state
let services: SystemService[] = [...INITIAL_SERVICES];
let resources: SystemResources = { ...INITIAL_RESOURCES };

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services,
    resources,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceId, action } = body;

    if (action === "restart-all") {
      services = services.map((s) => ({
        ...s,
        status: "running",
        uptime: "0m 05s",
        lastRestart: new Date().toISOString(),
      }));

      return NextResponse.json({
        success: true,
        message: "All services restarted successfully in local stack.",
        services,
      });
    }

    const serviceIndex = services.findIndex((s) => s.id === serviceId);
    if (serviceIndex === -1) {
      return NextResponse.json({ error: `Service '${serviceId}' not found.` }, { status: 404 });
    }

    const currentService = services[serviceIndex];

    if (action === "stop") {
      services[serviceIndex] = {
        ...currentService,
        status: "stopped",
        cpuPercent: 0,
        memoryMb: 0,
      };
    } else if (action === "start") {
      const initialMatch = INITIAL_SERVICES.find((s) => s.id === serviceId);
      services[serviceIndex] = {
        ...currentService,
        status: "running",
        cpuPercent: initialMatch?.cpuPercent || 2.5,
        memoryMb: initialMatch?.memoryMb || 512,
        uptime: "0m 02s",
        lastRestart: new Date().toISOString(),
      };
    } else if (action === "restart") {
      const initialMatch = INITIAL_SERVICES.find((s) => s.id === serviceId);
      services[serviceIndex] = {
        ...currentService,
        status: "running",
        uptime: "0m 01s",
        cpuPercent: initialMatch?.cpuPercent || 2.5,
        memoryMb: initialMatch?.memoryMb || 512,
        lastRestart: new Date().toISOString(),
      };
    } else {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    // Recalculate total RAM & CPU usage
    const totalUsedRam = services
      .filter((s) => s.status === "running")
      .reduce((acc, s) => acc + s.memoryMb, 0);

    resources = {
      ...resources,
      memory: {
        ...resources.memory,
        usedMb: totalUsedRam,
        freeMb: Math.max(0, resources.memory.totalMb - totalUsedRam),
      },
    };

    return NextResponse.json({
      success: true,
      service: services[serviceIndex],
      services,
      resources,
      message: `Aðgerð '${action}' framkvæmd á '${currentService.displayName}'.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
