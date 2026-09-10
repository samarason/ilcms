import { NextRequest, NextResponse } from "next/server";
import {
  timeEntriesStore,
  TimeEntryItem,
  TimeTaskCategory,
  expensesStore,
} from "@/lib/store";
import { calculateCostSummary } from "@/lib/costStatement";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entries = timeEntriesStore.filter((t) => t.case_id === id);
    const caseExpenses = expensesStore.filter((e) => e.case_id === id);
    const summary = calculateCostSummary(entries, caseExpenses);

    return NextResponse.json({
      time_entries: entries,
      summary,
    });
  } catch (error: any) {
    console.error("Error fetching time entries:", error);
    return NextResponse.json(
      { error: "Gat ekki sótt tímaliði: " + error?.message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      date,
      duration_minutes,
      hourly_rate,
      task_category,
      description,
      is_billable,
      user_name,
      user_role,
    } = body;

    if (!description || !duration_minutes) {
      return NextResponse.json(
        { error: "Lýsing og tímalengd í mínútum eru nauðsynlegir reitir." },
        { status: 400 }
      );
    }

    const newEntry: TimeEntryItem = {
      id: `time-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      case_id: id,
      user_id: "usr-lawyer-01",
      user_name: user_name || "Guðrún Sigurðardóttir hrl.",
      user_role: user_role || "Málflytjandi / Partner",
      date: date || new Date().toISOString().split("T")[0],
      duration_minutes: Number(duration_minutes),
      hourly_rate: Number(hourly_rate) || 36000,
      task_category: (task_category as TimeTaskCategory) || "pleading",
      description: description.trim(),
      is_billable: is_billable !== false,
      status: "unbilled",
      created_at: new Date().toISOString(),
    };

    timeEntriesStore.push(newEntry);

    const caseEntries = timeEntriesStore.filter((t) => t.case_id === id);
    const caseExpenses = expensesStore.filter((e) => e.case_id === id);
    const summary = calculateCostSummary(caseEntries, caseExpenses);

    return NextResponse.json({
      success: true,
      item: newEntry,
      summary,
    });
  } catch (error: any) {
    console.error("Error creating time entry:", error);
    return NextResponse.json(
      { error: "Gat ekki skráð tímalið: " + error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get("entryId");

    if (!entryId) {
      return NextResponse.json(
        { error: "entryId vantar." },
        { status: 400 }
      );
    }

    const idx = timeEntriesStore.findIndex(
      (t) => t.id === entryId && t.case_id === id
    );

    if (idx === -1) {
      return NextResponse.json(
        { error: "Tímaliður fannst ekki." },
        { status: 404 }
      );
    }

    timeEntriesStore.splice(idx, 1);

    const caseEntries = timeEntriesStore.filter((t) => t.case_id === id);
    const caseExpenses = expensesStore.filter((e) => e.case_id === id);
    const summary = calculateCostSummary(caseEntries, caseExpenses);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error("Error deleting time entry:", error);
    return NextResponse.json(
      { error: "Gat ekki eytt tímalið: " + error?.message },
      { status: 500 }
    );
  }
}
