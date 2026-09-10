import { NextRequest, NextResponse } from "next/server";
import {
  expensesStore,
  ExpenseItem,
  ExpenseType,
  timeEntriesStore,
} from "@/lib/store";
import { calculateCostSummary } from "@/lib/costStatement";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const items = expensesStore.filter((e) => e.case_id === id);
    return NextResponse.json({ expenses: items });
  } catch (error: any) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Gat ekki sótt útlagðan kostnað: " + error?.message },
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
      expense_type,
      title,
      amount,
      vat_rate,
      incurred_date,
      receipt_doc_title,
    } = body;

    if (!title || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "Heiti og fjárhæð eru nauðsynlegir reitir." },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);
    const parsedVatRate =
      expense_type === "court_fee"
        ? 0
        : vat_rate !== undefined
        ? Number(vat_rate)
        : 0.24;

    const vatAmount = Math.round(numericAmount * parsedVatRate);

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      case_id: id,
      expense_type: (expense_type as ExpenseType) || "other",
      title: title.trim(),
      amount: numericAmount,
      vat_rate: parsedVatRate,
      vat_amount: vatAmount,
      incurred_date: incurred_date || new Date().toISOString().split("T")[0],
      receipt_doc_title: receipt_doc_title?.trim() || undefined,
      status: "unbilled",
      created_at: new Date().toISOString(),
    };

    expensesStore.push(newExpense);

    const caseEntries = timeEntriesStore.filter((t) => t.case_id === id);
    const caseExpenses = expensesStore.filter((e) => e.case_id === id);
    const summary = calculateCostSummary(caseEntries, caseExpenses);

    return NextResponse.json({
      success: true,
      item: newExpense,
      summary,
    });
  } catch (error: any) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Gat ekki skráð kostnaðarlið: " + error?.message },
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
    const expenseId = searchParams.get("expenseId");

    if (!expenseId) {
      return NextResponse.json(
        { error: "expenseId vantar." },
        { status: 400 }
      );
    }

    const idx = expensesStore.findIndex(
      (e) => e.id === expenseId && e.case_id === id
    );

    if (idx === -1) {
      return NextResponse.json(
        { error: "Kostnaðarliður fannst ekki." },
        { status: 404 }
      );
    }

    expensesStore.splice(idx, 1);

    const caseEntries = timeEntriesStore.filter((t) => t.case_id === id);
    const caseExpenses = expensesStore.filter((e) => e.case_id === id);
    const summary = calculateCostSummary(caseEntries, caseExpenses);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Gat ekki eytt kostnaðarlið: " + error?.message },
      { status: 500 }
    );
  }
}
