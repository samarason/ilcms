import { NextRequest, NextResponse } from "next/server";
import {
  casesStore,
  timeEntriesStore,
  expensesStore,
  docsStore,
  DocumentItem,
} from "@/lib/store";
import {
  calculateCostSummary,
  formatCourtCostStatementText,
} from "@/lib/costStatement";

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

    const { searchParams } = new URL(req.url);
    const attorney =
      searchParams.get("attorney") || "Guðrún Sigurðardóttir hrl.";
    const party = searchParams.get("party") || undefined;
    const court = searchParams.get("court") || "Héraðsdómur Reykjavíkur";
    const judge = searchParams.get("judge") || undefined;
    const partyRole = searchParams.get("partyRole") || "Stefnandi";
    const clientVatDeductible = searchParams.get("clientVatDeductible") === "true";
    const includeInterestClaim = searchParams.get("includeInterestClaim") !== "false";
    const additionalRemarks = searchParams.get("additionalRemarks") || undefined;

    const timeIdsParam = searchParams.get("timeIds");
    const expIdsParam = searchParams.get("expIds");

    let caseEntries = timeEntriesStore.filter((t) => t.case_id === id);
    let caseExpenses = expensesStore.filter((e) => e.case_id === id);

    if (timeIdsParam) {
      const ids = timeIdsParam.split(",");
      caseEntries = caseEntries.filter((t) => ids.includes(t.id));
    }
    if (expIdsParam) {
      const ids = expIdsParam.split(",");
      caseExpenses = caseExpenses.filter((e) => ids.includes(e.id));
    }

    const summary = calculateCostSummary(caseEntries, caseExpenses);
    const formattedText = formatCourtCostStatementText(
      caseItem,
      caseEntries,
      caseExpenses,
      {
        attorneyName: attorney,
        partyName: party,
        courtName: court,
        judgeName: judge,
        partyRole,
        clientVatDeductible,
        includeInterestClaim,
        additionalRemarks,
      }
    );

    return NextResponse.json({
      case: caseItem,
      summary,
      formatted_text: formattedText,
      time_entries: caseEntries,
      expenses: caseExpenses,
    });
  } catch (error: any) {
    console.error("Error generating cost statement:", error);
    return NextResponse.json(
      { error: "Gat ekki útbúið málskostnaðaryfirlit: " + error?.message },
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

    const body = await req.json().catch(() => ({}));
    const attorney = body.attorney || "Guðrún Sigurðardóttir hrl.";
    const party = body.party || undefined;
    const court = body.court || "Héraðsdómur Reykjavíkur";
    const judge = body.judge || undefined;
    const partyRole = body.partyRole || "Stefnandi";
    const clientVatDeductible = Boolean(body.clientVatDeductible);
    const includeInterestClaim = body.includeInterestClaim !== false;
    const additionalRemarks = body.additionalRemarks || undefined;

    let caseEntries = timeEntriesStore.filter((t) => t.case_id === id);
    let caseExpenses = expensesStore.filter((e) => e.case_id === id);

    if (body.timeIds && Array.isArray(body.timeIds)) {
      caseEntries = caseEntries.filter((t) => body.timeIds.includes(t.id));
    }
    if (body.expIds && Array.isArray(body.expIds)) {
      caseExpenses = caseExpenses.filter((e) => body.expIds.includes(e.id));
    }

    const summary = calculateCostSummary(caseEntries, caseExpenses);
    const formattedText = formatCourtCostStatementText(
      caseItem,
      caseEntries,
      caseExpenses,
      {
        attorneyName: attorney,
        partyName: party,
        courtName: court,
        judgeName: judge,
        partyRole,
        clientVatDeductible,
        includeInterestClaim,
        additionalRemarks,
      }
    );

    const feeAmount = clientVatDeductible ? summary.legalFeeExVat : summary.legalFeeIncVat;
    const expAmount = clientVatDeductible ? (summary.courtFees + summary.otherExpensesExVat) : summary.totalExpensesIncVat;
    const grandTotal = feeAmount + expAmount;

    const title = `Málskostnaðaryfirlit (${court}) - ${caseItem.case_number} (${new Date().toISOString().split("T")[0]}).txt`;

    const newDoc: DocumentItem = {
      id: `doc-cost-${Date.now()}`,
      case_id: id,
      title,
      doc_type: "Málskostnaðaryfirlit",
      status: "READY",
      page_count: Math.max(1, Math.ceil(formattedText.split("\n").length / 45)),
      created_at: new Date().toISOString(),
      filing_date: new Date().toISOString().split("T")[0],
      author: attorney,
      summary: `Málskostnaðarkrafa kr. ${grandTotal.toLocaleString("is-IS")} (${clientVatDeductible ? "án VSK" : "m. VSK"}). Þóknun kr. ${feeAmount.toLocaleString("is-IS")} (${summary.billableHours} klst.) + gjöld kr. ${expAmount.toLocaleString("is-IS")}.`,
      content: formattedText,
      notes: `Útbúið skv. 130. gr. laga nr. 91/1991 um meðferð einkamála til framlagningar fyrir ${court}.${judge ? ` Dómari: ${judge}.` : ""}`,
      notes_updated_at: new Date().toISOString(),
      version: 1,
      versions: [
        {
          id: `v-cost-${Date.now()}-1`,
          version_number: 1,
          created_at: new Date().toISOString(),
          author: attorney,
          change_summary: `Formlegt málskostnaðaryfirlit lagt fram fyrir ${court}`,
          title,
          content: formattedText,
          page_count: Math.max(1, Math.ceil(formattedText.split("\n").length / 45)),
        },
      ],
    };

    docsStore.unshift(newDoc);

    return NextResponse.json({
      success: true,
      message: "Málskostnaðaryfirlit vistað í málasafn",
      document: newDoc,
      summary,
    });
  } catch (error: any) {
    console.error("Error saving cost statement as document:", error);
    return NextResponse.json(
      { error: "Gat ekki vistað málskostnaðaryfirlit: " + error?.message },
      { status: 500 }
    );
  }
}
