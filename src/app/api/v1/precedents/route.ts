import { NextResponse } from "next/server";
import { PRE_SEEDED_STATUTES, PRE_SEEDED_PRECEDENTS } from "@/lib/legal-knowledge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").toLowerCase().trim();
    const type = searchParams.get("type"); // "statutes" | "precedents" | all

    let statutes = PRE_SEEDED_STATUTES;
    let precedents = PRE_SEEDED_PRECEDENTS;

    if (query) {
      statutes = statutes.filter(
        (s) =>
          s.act_name.toLowerCase().includes(query) ||
          s.article.toLowerCase().includes(query) ||
          s.title.toLowerCase().includes(query) ||
          s.text.toLowerCase().includes(query) ||
          s.keywords.some((k) => k.toLowerCase().includes(query))
      );

      precedents = precedents.filter(
        (p) =>
          p.case_reference.toLowerCase().includes(query) ||
          p.court.toLowerCase().includes(query) ||
          p.parties.toLowerCase().includes(query) ||
          p.summary.toLowerCase().includes(query) ||
          p.key_findings.toLowerCase().includes(query) ||
          p.statutory_basis.some((b) => b.toLowerCase().includes(query))
      );
    }

    if (type === "statutes") {
      return NextResponse.json({ statutes });
    }
    if (type === "precedents") {
      return NextResponse.json({ precedents });
    }

    return NextResponse.json({
      statutes,
      precedents,
      total_statutes: statutes.length,
      total_precedents: precedents.length,
      vector_model: "nomic-embed-text / pgvector (768d)",
    });
  } catch (error) {
    return NextResponse.json({ error: "Gat ekki sótt fordæmasafn" }, { status: 500 });
  }
}
