import { NextResponse } from "next/server";
import { deadlinesStore, casesStore } from "@/lib/store";
import { calculateCivilSummonsDeadlines, SummonsCalculationInput } from "@/lib/statutory-deadlines";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("case_id");

    if (caseId) {
      const filtered = deadlinesStore.filter((d) => d.case_id === caseId);
      return NextResponse.json(filtered);
    }

    return NextResponse.json(deadlinesStore);
  } catch (err) {
    return NextResponse.json({ error: "Gat ekki sótt lögboðna fresti" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, case_id, calculation_input, deadline_item } = body;

    // 1. Action: calculate summons deadlines
    if (action === "calculate") {
      const input: SummonsCalculationInput = calculation_input || {
        serviceDate: new Date().toISOString().split("T")[0],
        defendantLocation: "same_district",
      };
      const result = calculateCivilSummonsDeadlines(input);
      return NextResponse.json(result);
    }

    // 2. Action: save calculated deadlines to a case
    if (action === "save_to_case" && case_id) {
      const { deadlines } = body;
      if (Array.isArray(deadlines)) {
        for (const dl of deadlines) {
          deadlinesStore.push({
            id: `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            case_id,
            name: dl.name,
            category: dl.category,
            target_date: dl.targetDate || dl.target_date,
            statutory_reference: dl.statutoryReference || dl.statutory_reference,
            description: dl.description,
            is_court_recess_adjusted: !!dl.isCourtRecessAdjusted,
            status: dl.status || "pending",
            created_at: new Date().toISOString(),
          });
        }
      }
      return NextResponse.json({ success: true, count: deadlines?.length || 0 });
    }

    // 3. Action: manual create
    if (deadline_item && case_id) {
      const newItem = {
        id: `dl-${Date.now()}`,
        case_id,
        name: deadline_item.name,
        category: deadline_item.category || "stefnufrestur",
        target_date: deadline_item.target_date,
        statutory_reference: deadline_item.statutory_reference || "Lög nr. 91/1991",
        description: deadline_item.description || "",
        is_court_recess_adjusted: false,
        status: deadline_item.status || "pending",
        created_at: new Date().toISOString(),
      };
      deadlinesStore.push(newItem);
      return NextResponse.json(newItem);
    }

    return NextResponse.json({ error: "Ógild beiðni" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Villa við útreikning eða vistun fresta" }, { status: 500 });
  }
}
