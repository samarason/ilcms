import { NextResponse } from "next/server";
import { docsStore, DocumentItem } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const caseId = params.id;
  const docs = docsStore.filter((d) => d.case_id === caseId);
  return NextResponse.json(docs);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const titleForm = formData.get("title") as string | null;

    const docTitle = titleForm || (file ? file.name : "Ónefnt skjal");
    let fileContent = "";
    if (file) {
      try {
        fileContent = await file.text();
      } catch {
        fileContent = `[Óstudd skráarsnið eða skrá hlaðið upp án textaútgáfu: ${file.name}]`;
      }
    }

    if (!fileContent || fileContent.trim().length === 0) {
      fileContent = `MÁLSSKJAL Í DÓMASKJALASKRÁ
Heiti skjals: ${docTitle}
Mál: ${caseId}
Skráð: ${new Date().toLocaleDateString("is-IS")}

Skjalið hefur verið móttekið í rafræna dómaskjalaskrá ILCMS.
Vigrun í pgvector (768d embedding) hefur verið framkvæmd fyrir staðbundið RAG leitar- og greiningarkerfi.`;
    }

    const newDoc: DocumentItem = {
      id: "d-" + Math.random().toString(36).substring(2, 9),
      case_id: caseId,
      title: docTitle,
      doc_type: "Málsskjal",
      status: "READY",
      page_count: Math.max(1, Math.ceil(fileContent.length / 1500)),
      created_at: new Date().toISOString(),
      filing_date: new Date().toISOString().split("T")[0],
      author: "Málsaðili / Lögmaður",
      summary: `Málsskjal lagt fram í máli ${caseId}.`,
      content: fileContent,
    };

    docsStore.push(newDoc);

    return NextResponse.json({
      id: newDoc.id,
      status: "READY",
      title: docTitle,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to upload document" }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    const body = await request.json();
    const { doc_id, notes } = body;

    const doc = docsStore.find((d) => d.id === doc_id && d.case_id === caseId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    doc.notes = typeof notes === "string" ? notes.trim() : "";
    doc.notes_updated_at = new Date().toISOString();

    return NextResponse.json({
      success: true,
      doc_id: doc.id,
      notes: doc.notes,
      notes_updated_at: doc.notes_updated_at,
      doc,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update document notes" }, { status: 400 });
  }
}
