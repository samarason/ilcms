import { NextRequest, NextResponse } from "next/server";
import {
  invoicesStore,
  retainersStore,
  timeEntriesStore,
  expensesStore,
  calculateRetainerBalance,
} from "@/lib/store";
import { formatIcelandicInvoiceText } from "@/lib/invoiceUtils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = invoicesStore.find((inv) => inv.id === id || inv.invoice_number === id);

    if (!invoice) {
      return NextResponse.json(
        { error: "Reikningur fannst ekki." },
        { status: 404 }
      );
    }

    const formattedText = formatIcelandicInvoiceText(invoice);

    return NextResponse.json({
      success: true,
      invoice,
      formatted_text: formattedText,
    });
  } catch (error: any) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Gat ekki sótt reikning: " + error?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = invoicesStore.find((inv) => inv.id === id || inv.invoice_number === id);

    if (!invoice) {
      return NextResponse.json(
        { error: "Reikningur fannst ekki." },
        { status: 404 }
      );
    }

    const body = await req.json();

    if (body.status) {
      if (!["draft", "issued", "paid", "cancelled"].includes(body.status)) {
        return NextResponse.json(
          { error: "Ógild staða reiknings." },
          { status: 400 }
        );
      }
      invoice.status = body.status;

      if (body.status === "paid") {
        invoice.payment_date = body.payment_date || new Date().toISOString().split("T")[0];
        invoice.payment_reference = body.payment_reference || "Greiðsla móttekin";
      }

      // If cancelled, revert time entries and expenses to unbilled, and refund retainer deduction
      if (body.status === "cancelled") {
        const timeIds = invoice.line_items
          .filter((li) => li.type === "time" && li.ref_id)
          .map((li) => li.ref_id as string);
        for (const t of timeEntriesStore) {
          if (timeIds.includes(t.id)) {
            t.status = "unbilled";
          }
        }

        const expIds = invoice.line_items
          .filter((li) => li.type === "expense" && li.ref_id)
          .map((li) => li.ref_id as string);
        for (const e of expensesStore) {
          if (expIds.includes(e.id)) {
            e.status = "unbilled";
          }
        }

        // If a retainer was deducted, create a reversal/refund transaction
        if (invoice.retainer_deducted > 0) {
          retainersStore.unshift({
            id: `ret-rev-${Date.now()}`,
            case_id: invoice.case_id,
            type: "deposit",
            amount: invoice.retainer_deducted,
            date: new Date().toISOString().split("T")[0],
            payment_method: "bank_transfer",
            reference: `Bakfærsla vegna niðurfellds reiknings ${invoice.invoice_number}`,
            notes: `Bakfært tryggingafé vegna ógildingar reiknings nr. ${invoice.invoice_number}.`,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    if (body.notes !== undefined) {
      invoice.notes = body.notes;
    }

    return NextResponse.json({
      success: true,
      message: "Reikningur var uppfærður.",
      invoice,
    });
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Gat ekki uppfært reikning: " + error?.message },
      { status: 500 }
    );
  }
}
