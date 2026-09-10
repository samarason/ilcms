import { NextResponse } from "next/server";
import { casesStore, docsStore } from "@/lib/store";
import { PRE_SEEDED_STATUTES, PRE_SEEDED_PRECEDENTS, LegalStatute, LegalPrecedent } from "@/lib/legal-knowledge";
import { generateLegalDraft, LegalDocType } from "@/lib/legal-drafting";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      case_id,
      doc_type = "stefna",
      selected_statute_ids = [],
      selected_precedent_ids = [],
      selected_doc_ids = [],
      court_name = "Héraðsdómur Reykjavíkur",
      claim_amount,
      custom_claims,
      lawyer_notes,
    } = body;

    const matchedCase = casesStore.find((c) => c.id === case_id) || casesStore[0];
    if (!matchedCase) {
      return NextResponse.json(
        { error: "Mál fannst ekki í kerfinu." },
        { status: 404 }
      );
    }

    // Filter or fetch documents for the case
    const caseDocs = docsStore.filter((d) => d.case_id === matchedCase.id);
    const chosenDocs =
      selected_doc_ids && selected_doc_ids.length > 0
        ? caseDocs.filter((d) => selected_doc_ids.includes(d.id))
        : caseDocs;

    // Resolve statutes
    let chosenStatutes: LegalStatute[] = [];
    if (selected_statute_ids && selected_statute_ids.length > 0) {
      chosenStatutes = PRE_SEEDED_STATUTES.filter((s) =>
        selected_statute_ids.includes(s.id)
      );
    } else {
      // Default statutes based on doc_type or case category
      if (doc_type === "stefna") {
        chosenStatutes = PRE_SEEDED_STATUTES.filter((s) =>
          ["statute-em-80", "statute-em-130", "statute-vx-8-9"].includes(s.id)
        );
      } else {
        chosenStatutes = PRE_SEEDED_STATUTES.filter((s) =>
          ["statute-em-97", "statute-em-130"].includes(s.id)
        );
      }
    }

    // Resolve precedents
    let chosenPrecedents: LegalPrecedent[] = [];
    if (selected_precedent_ids && selected_precedent_ids.length > 0) {
      chosenPrecedents = PRE_SEEDED_PRECEDENTS.filter((p) =>
        selected_precedent_ids.includes(p.id)
      );
    } else if (matchedCase.id === "case-01") {
      chosenPrecedents = PRE_SEEDED_PRECEDENTS.filter((p) =>
        ["prec-hrd-58-2020", "prec-hrd-412-2019"].includes(p.id)
      );
    } else if (matchedCase.id === "case-03") {
      chosenPrecedents = PRE_SEEDED_PRECEDENTS.filter((p) =>
        ["prec-hrd-120-2021"].includes(p.id)
      );
    }

    const draftResult = await generateLegalDraft(
      matchedCase,
      doc_type as LegalDocType,
      chosenStatutes,
      chosenPrecedents,
      chosenDocs,
      court_name,
      claim_amount,
      custom_claims,
      lawyer_notes
    );

    return NextResponse.json(draftResult);
  } catch (error: any) {
    console.error("[Legal Draft API Error]:", error);
    return NextResponse.json(
      { error: "Villa kom upp við sjálfvirka skjalagerð: " + (error?.message || error) },
      { status: 500 }
    );
  }
}
