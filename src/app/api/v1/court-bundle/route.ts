import { NextResponse } from "next/server";
import { casesStore, docsStore } from "@/lib/store";
import { generateCourtBundle, formatDomaskjalaskraText } from "@/lib/court-bundle";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("case_id");
    const format = searchParams.get("format") || "json";

    if (!caseId) {
      return NextResponse.json({ error: "Málsnúmer vantar (case_id)" }, { status: 400 });
    }

    const matchedCase = casesStore.find((c) => c.id === caseId);
    if (!matchedCase) {
      return NextResponse.json({ error: "Mál fannst ekki" }, { status: 404 });
    }

    const matchedDocs = docsStore.filter((d) => d.case_id === caseId);

    const bundle = generateCourtBundle(matchedCase, matchedDocs);
    const formattedText = formatDomaskjalaskraText(bundle);

    if (format === "text") {
      return new NextResponse(formattedText, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="domaskjalaskra-${matchedCase.case_number.replace(/[^a-zA-Z0-9]/g, "_")}.txt"`,
        },
      });
    }

    return NextResponse.json({
      bundle,
      formattedText,
      total_exhibits: bundle.totalExhibits,
      total_pages: bundle.totalPages,
    });
  } catch (error) {
    return NextResponse.json({ error: "Villa við gerð málsgagnasafns" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { case_id, overrides } = body;

    if (!case_id) {
      return NextResponse.json({ error: "case_id vantar" }, { status: 400 });
    }

    const matchedCase = casesStore.find((c) => c.id === case_id);
    if (!matchedCase) {
      return NextResponse.json({ error: "Mál fannst ekki" }, { status: 404 });
    }

    const matchedDocs = docsStore.filter((d) => d.case_id === case_id);
    const bundle = generateCourtBundle(matchedCase, matchedDocs, overrides);
    const formattedText = formatDomaskjalaskraText(bundle);

    return NextResponse.json({
      bundle,
      formattedText,
    });
  } catch (error) {
    return NextResponse.json({ error: "Villa við uppfærslu málsgagnasafns" }, { status: 500 });
  }
}
