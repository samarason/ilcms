import { NextResponse } from "next/server";
import { casesStore, CaseItem } from "@/lib/store";

export async function GET() {
  return NextResponse.json(casesStore);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const newCase: CaseItem = {
      id: "c-" + Math.random().toString(36).substring(2, 9),
      case_number: `M-${hex}/2026`,
      title: body.title || "Ónefnt mál",
      description: body.description || "",
      priority: body.priority || "NORMAL",
      status: "OPEN",
      created_at: new Date().toISOString(),
    };

    casesStore.unshift(newCase);

    return NextResponse.json({
      id: newCase.id,
      case_number: newCase.case_number,
      status: newCase.status,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create case" }, { status: 400 });
  }
}
