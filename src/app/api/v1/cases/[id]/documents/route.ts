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
    const newDoc: DocumentItem = {
      id: "d-" + Math.random().toString(36).substring(2, 9),
      case_id: caseId,
      title: docTitle,
      doc_type: "Málsskjal",
      status: "READY",
      page_count: Math.floor(Math.random() * 10) + 1,
      created_at: new Date().toISOString(),
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
