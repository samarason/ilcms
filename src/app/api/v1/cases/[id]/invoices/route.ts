import { NextRequest, NextResponse } from "next/server";
import {
  invoicesStore,
  casesStore,
  timeEntriesStore,
  expensesStore,
  retainersStore,
  docsStore,
  calculateRetainerBalance,
  InvoiceItem,
  InvoiceLineItem,
  RetainerTransactionItem,
  DocumentItem,
} from "@/lib/store";
import { formatIcelandicInvoiceText } from "@/lib/invoiceUtils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseItem = casesStore.find((c) => c.id === id);

    if (!caseItem) {
      return NextResponse.json(
        { error: "Mál fannst ekki." },
        { status: 404 }
      );
    }

    const caseInvoices = invoicesStore.filter((inv) => inv.case_id === id);

    return NextResponse.json({
      success: true,
      invoices: caseInvoices.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    });
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Gat ekki sótt reikninga: " + error?.message },
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
    const caseItem = casesStore.find((c) => c.id === id);

    if (!caseItem) {
      return NextResponse.json(
        { error: "Mál fannst ekki." },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Default Client details from case if not provided
    const clientName =
      body.client_name ||
      (caseItem.title.includes(" gegn ") ? caseItem.title.split(" gegn ")[0] : "Umbjóðandi");
    const clientKennitala = body.client_kennitala || "";
    const clientAddress = body.client_address || "";

    const attorneyName = body.attorney_name || "Guðrún Sigurðardóttir hrl.";
    const lawFirmName = body.law_firm_name || "Lögmenn Lækjargötu slf.";
    const lawFirmKennitala = body.law_firm_kennitala || "540209-1120";
    const lawFirmVatNo = body.law_firm_vat_no || "102345";
    const lawFirmBank = body.law_firm_bank || "0101-26-045678";

    // Dates
    const today = new Date();
    const issueDate = body.issue_date || today.toISOString().split("T")[0];

    const dueDateObj = new Date(today);
    dueDateObj.setDate(dueDateObj.getDate() + 14);
    const dueDate = body.due_date || dueDateObj.toISOString().split("T")[0];

    const penaltyDateObj = new Date(today);
    penaltyDateObj.setDate(penaltyDateObj.getDate() + 30);
    const penaltyDate = body.penalty_date || penaltyDateObj.toISOString().split("T")[0];

    // Status
    const status = body.status || "issued"; // "draft" | "issued" | "paid"

    // Process line items
    let lineItems: InvoiceLineItem[] = [];

    if (body.line_items && Array.isArray(body.line_items) && body.line_items.length > 0) {
      lineItems = body.line_items;
    } else {
      // If timeIds / expenseIds passed, construct line items from those
      if (body.time_ids && Array.isArray(body.time_ids)) {
        const selectedTimes = timeEntriesStore.filter(
          (t) => t.case_id === id && body.time_ids.includes(t.id)
        );
        for (const t of selectedTimes) {
          const hours = t.duration_minutes / 60;
          const exVat = Math.round(hours * t.hourly_rate);
          const vat = Math.round(exVat * 0.24);
          lineItems.push({
            id: `inv-li-${Date.now()}-${t.id}`,
            type: "time",
            ref_id: t.id,
            description: `${t.description} (${hours.toFixed(1)} klst. á kr. ${t.hourly_rate.toLocaleString("is-IS")})`,
            quantity: hours,
            unit_price: t.hourly_rate,
            vat_rate: 0.24,
            amount_ex_vat: exVat,
            vat_amount: vat,
            total_inc_vat: exVat + vat,
          });
        }
      }

      if (body.expense_ids && Array.isArray(body.expense_ids)) {
        const selectedExpenses = expensesStore.filter(
          (e) => e.case_id === id && body.expense_ids.includes(e.id)
        );
        for (const e of selectedExpenses) {
          const vat = e.vat_amount || 0;
          lineItems.push({
            id: `inv-li-${Date.now()}-${e.id}`,
            type: "expense",
            ref_id: e.id,
            description: `${e.title}${e.receipt_doc_title ? ` [Fskj.: ${e.receipt_doc_title}]` : ""}`,
            quantity: 1,
            unit_price: e.amount,
            vat_rate: e.vat_rate,
            amount_ex_vat: e.amount,
            vat_amount: vat,
            total_inc_vat: e.amount + vat,
          });
        }
      }
    }

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: "Reikningur verður að innihalda að minnsta kosti einn lið." },
        { status: 400 }
      );
    }

    // Totals
    const subtotalExVat = lineItems.reduce((acc, li) => acc + li.amount_ex_vat, 0);
    const totalVat = lineItems.reduce((acc, li) => acc + li.vat_amount, 0);
    const totalIncVat = subtotalExVat + totalVat;

    // Retainer deduction calculation
    const retainerBalance = calculateRetainerBalance(id, retainersStore).currentBalance;
    let requestedRetainer = Number(body.retainer_deducted || 0);

    // If requested is greater than available or total invoice, clamp it
    if (requestedRetainer > retainerBalance) {
      requestedRetainer = retainerBalance;
    }
    if (requestedRetainer > totalIncVat) {
      requestedRetainer = totalIncVat;
    }

    const finalAmountDue = Math.max(0, totalIncVat - requestedRetainer);

    // Sequential invoice numbering
    const currentYear = new Date().getFullYear();
    const currentYearInvoices = invoicesStore.filter((inv) =>
      inv.invoice_number.startsWith(`REIK-${currentYear}`)
    );
    const nextSeq = (currentYearInvoices.length + 1).toString().padStart(4, "0");
    const invoiceNumber = `REIK-${currentYear}-${nextSeq}`;

    const newInvoice: InvoiceItem = {
      id: `inv-${Date.now()}`,
      invoice_number: invoiceNumber,
      case_id: id,
      case_number: caseItem.case_number,
      case_title: caseItem.title,
      client_name: clientName,
      client_kennitala: clientKennitala || undefined,
      client_address: clientAddress || undefined,
      attorney_name: attorneyName,
      law_firm_name: lawFirmName,
      law_firm_kennitala: lawFirmKennitala,
      law_firm_vat_no: lawFirmVatNo,
      law_firm_bank: lawFirmBank,
      issue_date: issueDate,
      due_date: dueDate,
      penalty_date: penaltyDate,
      status,
      line_items: lineItems,
      subtotal_ex_vat: subtotalExVat,
      total_vat: totalVat,
      total_inc_vat: totalIncVat,
      retainer_deducted: requestedRetainer,
      final_amount_due: finalAmountDue,
      notes: body.notes || undefined,
      payment_date: status === "paid" ? issueDate : undefined,
      payment_reference: status === "paid" ? "Greitt við útgáfu" : undefined,
      created_at: new Date().toISOString(),
    };

    invoicesStore.unshift(newInvoice);

    // 1. Mark included time entries as "invoiced"
    const invoicedTimeIds = lineItems
      .filter((li) => li.type === "time" && li.ref_id)
      .map((li) => li.ref_id as string);
    for (const entry of timeEntriesStore) {
      if (invoicedTimeIds.includes(entry.id)) {
        entry.status = "invoiced";
      }
    }

    // 2. Mark included expenses as "invoiced"
    const invoicedExpenseIds = lineItems
      .filter((li) => li.type === "expense" && li.ref_id)
      .map((li) => li.ref_id as string);
    for (const exp of expensesStore) {
      if (invoicedExpenseIds.includes(exp.id)) {
        exp.status = "invoiced";
      }
    }

    // 3. If retainer was deducted, record a deduction transaction in retainersStore
    if (requestedRetainer > 0) {
      const deductionTx: RetainerTransactionItem = {
        id: `ret-deduct-${Date.now()}`,
        case_id: id,
        type: "deduction",
        amount: requestedRetainer,
        date: issueDate,
        payment_method: "bank_transfer",
        reference: `Ráðstöfun á reikning ${invoiceNumber}`,
        invoice_id: newInvoice.id,
        invoice_number: invoiceNumber,
        notes: `Frádráttur af tryggingafé vegna reiknings nr. ${invoiceNumber}.`,
        created_at: new Date().toISOString(),
      };
      retainersStore.unshift(deductionTx);
    }

    // 4. Archive invoice as a formal document in case dossier
    const formattedInvoiceText = formatIcelandicInvoiceText(newInvoice);
    const invoiceDoc: DocumentItem = {
      id: `doc-inv-${Date.now()}`,
      case_id: id,
      title: `Reikningur ${invoiceNumber} (${clientName}).txt`,
      doc_type: "Reikningur",
      status: "READY",
      page_count: 1,
      created_at: new Date().toISOString(),
      filing_date: issueDate,
      author: attorneyName,
      summary: `Útgefinn reikningur nr. ${invoiceNumber}. Upphæð kr. ${totalIncVat.toLocaleString(
        "is-IS"
      )} m. VSK${
        requestedRetainer > 0
          ? ` (þar af dregið tryggingafé kr. ${requestedRetainer.toLocaleString(
              "is-IS"
            )}, eftirstöðvar kr. ${finalAmountDue.toLocaleString("is-IS")})`
          : ""
      }.`,
      content: formattedInvoiceText,
      version: 1,
      versions: [
        {
          id: `v-inv-${Date.now()}`,
          version_number: 1,
          created_at: new Date().toISOString(),
          author: attorneyName,
          change_summary: "Reikningur færður í málasafn",
          title: `Reikningur ${invoiceNumber}.txt`,
          content: formattedInvoiceText,
          page_count: 1,
        },
      ],
    };
    docsStore.unshift(invoiceDoc);

    return NextResponse.json({
      success: true,
      message: `Reikningur ${invoiceNumber} var útbúinn með góðum árangri.`,
      invoice: newInvoice,
      document: invoiceDoc,
      updated_retainer_balance: calculateRetainerBalance(id, retainersStore).currentBalance,
    });
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Gat ekki búið til reikning: " + error?.message },
      { status: 500 }
    );
  }
}
