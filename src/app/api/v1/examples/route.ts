import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { docsStore, casesStore, DocumentItem, CaseItem } from "@/lib/store";

export interface ExampleDocumentMeta {
  id: string;
  filename: string;
  title: string;
  doc_type: string;
  author: string;
  filing_date: string;
  page_count: number;
  summary: string;
  tags: string[];
  content?: string;
  file_size?: number;
}

function getExamplesDir(): string {
  // Check /examples, ./examples, or ./public/examples
  const possiblePaths = [
    path.join(process.cwd(), "examples"),
    "/examples",
    path.join(process.cwd(), "public", "examples"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return path.join(process.cwd(), "examples");
}

export async function GET() {
  try {
    const examplesDir = getExamplesDir();
    const manifestPath = path.join(examplesDir, "manifest.json");

    if (!fs.existsSync(manifestPath)) {
      return NextResponse.json({ error: "Manifest not found in examples directory" }, { status: 404 });
    }

    const manifestRaw = fs.readFileSync(manifestPath, "utf-8");
    const manifest: ExampleDocumentMeta[] = JSON.parse(manifestRaw);

    const enrichedExamples = manifest.map((item) => {
      const filePath = path.join(examplesDir, item.filename);
      let content = "";
      let fileSize = 0;

      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, "utf-8");
        fileSize = Buffer.byteLength(content, "utf-8");
      }

      return {
        ...item,
        content,
        file_size: fileSize,
      };
    });

    return NextResponse.json(enrichedExamples);
  } catch (error) {
    console.error("Error reading /examples directory:", error);
    return NextResponse.json({ error: "Failed to load examples" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, caseId, exampleIds, newCaseTitle, newCaseDescription, newCasePriority } = body;

    const examplesDir = getExamplesDir();
    const manifestPath = path.join(examplesDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
    }

    const manifest: ExampleDocumentMeta[] = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const selectedMeta = manifest.filter((m) => (exampleIds || []).includes(m.id));

    if (selectedMeta.length === 0) {
      return NextResponse.json({ error: "Engin dæmaskjöl voru valin (No examples selected)" }, { status: 400 });
    }

    let targetCaseId = caseId;
    let createdCase: CaseItem | null = null;

    if (mode === "create_new_case") {
      const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
      const newCase: CaseItem = {
        id: "c-" + Math.random().toString(36).substring(2, 9),
        case_number: `M-${hex}/2026`,
        title: newCaseTitle || "Húsfélagið Hlíðarvegi 42 gegn Byggingafélaginu Vörðu ehf.",
        description:
          newCaseDescription ||
          "Dómsmál vegna riftunar verksamnings, verulegra galla á utanhússklæðningu, rakaskemmda og bótagreiðslu skv. dómkvaddri matsgerð.",
        priority: newCasePriority || "HIGH",
        status: "ACTIVE",
        created_at: new Date().toISOString(),
      };
      casesStore.unshift(newCase);
      targetCaseId = newCase.id;
      createdCase = newCase;
    } else {
      // Validate target case
      const existing = casesStore.find((c) => c.id === targetCaseId);
      if (!existing) {
        return NextResponse.json({ error: "Mál fannst ekki (Case not found)" }, { status: 404 });
      }
    }

    // Insert selected example documents into docsStore for targetCaseId
    const insertedDocs: DocumentItem[] = [];

    for (const ex of selectedMeta) {
      const filePath = path.join(examplesDir, ex.filename);
      let content = "";
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, "utf-8");
      }

      const docId = "doc-ex-" + Math.random().toString(36).substring(2, 9);
      const isPdfLike = ex.title.toLowerCase().endsWith(".pdf");

      const initialVer = {
        id: `v-${docId}-1`,
        version_number: 1,
        created_at: new Date().toISOString(),
        author: ex.author || "Sérfræðingur / Málsaðili",
        change_summary: "Sótt úr dæmasafni /examples og sett inn í mál",
        title: ex.title,
        content: content,
        page_count: ex.page_count || 1,
        is_pdf: isPdfLike,
        file_size: Buffer.byteLength(content, "utf-8"),
      };

      const newDoc: DocumentItem = {
        id: docId,
        case_id: targetCaseId,
        title: ex.title,
        doc_type: ex.doc_type,
        status: "READY",
        page_count: ex.page_count || 1,
        created_at: new Date().toISOString(),
        filing_date: ex.filing_date || new Date().toISOString().split("T")[0],
        author: ex.author,
        summary: ex.summary,
        content: content,
        is_pdf: isPdfLike,
        file_size: Buffer.byteLength(content, "utf-8"),
        version: 1,
        versions: [initialVer],
      };

      docsStore.unshift(newDoc);
      insertedDocs.push(newDoc);
    }

    return NextResponse.json({
      success: true,
      caseId: targetCaseId,
      createdCase,
      insertedCount: insertedDocs.length,
      insertedDocs,
    });
  } catch (error) {
    console.error("Error inserting example documents:", error);
    return NextResponse.json({ error: "Failed to insert example documents" }, { status: 500 });
  }
}
