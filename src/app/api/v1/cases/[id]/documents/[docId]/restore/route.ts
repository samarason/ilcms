import { NextResponse } from "next/server";
import { docsStore, DocumentVersion } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const { id: caseId, docId } = params;
    const doc = docsStore.find((d) => d.id === docId && d.case_id === caseId);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = await request.json();
    const versionNumber = Number(body.version_number);

    if (!versionNumber) {
      return NextResponse.json({ error: "Invalid version number" }, { status: 400 });
    }

    const targetVersion = doc.versions?.find((v) => v.version_number === versionNumber);
    if (!targetVersion) {
      return NextResponse.json({ error: "Version not found in history" }, { status: 404 });
    }

    // In court systems, rolling back creates a new active revision pointing to the historical version
    const highestVersion = doc.versions?.reduce(
      (max, v) => Math.max(max, v.version_number),
      doc.version || 1
    ) || 1;
    const nextVersionNum = highestVersion + 1;

    const rollbackVersion: DocumentVersion = {
      id: "v-" + Math.random().toString(36).substring(2, 9),
      version_number: nextVersionNum,
      created_at: new Date().toISOString(),
      author: body.author || "Guðrún Sigurðardóttir hrl.",
      change_summary: `Endurheimt útgáfa frá útgáfu v${targetVersion.version_number} (${targetVersion.created_at.split("T")[0]}): ${targetVersion.change_summary || targetVersion.title}`,
      title: targetVersion.title,
      content: targetVersion.content,
      page_count: targetVersion.page_count,
      is_pdf: targetVersion.is_pdf,
      pdf_data_url: targetVersion.pdf_data_url,
      is_docx: targetVersion.is_docx,
      docx_data_url: targetVersion.docx_data_url,
      html_content: targetVersion.html_content,
      file_size: targetVersion.file_size,
    };

    if (!doc.versions) doc.versions = [];
    doc.versions.push(rollbackVersion);
    doc.version = nextVersionNum;
    doc.updated_at = rollbackVersion.created_at;
    doc.title = rollbackVersion.title;
    doc.content = rollbackVersion.content;
    doc.html_content = rollbackVersion.html_content;
    doc.page_count = rollbackVersion.page_count;
    doc.is_pdf = rollbackVersion.is_pdf;
    doc.pdf_data_url = rollbackVersion.pdf_data_url;
    doc.is_docx = rollbackVersion.is_docx;
    doc.docx_data_url = rollbackVersion.docx_data_url;
    doc.file_size = rollbackVersion.file_size;
    if (rollbackVersion.is_docx) {
      doc.doc_type = "Dómaskjal (Word DOCX)";
    } else if (rollbackVersion.is_pdf) {
      doc.doc_type = "Dómaskjal (PDF)";
    }

    return NextResponse.json({
      success: true,
      restored_from: versionNumber,
      active_version: nextVersionNum,
      doc,
    });
  } catch (error) {
    console.error("Error restoring version:", error);
    return NextResponse.json({ error: "Failed to restore version" }, { status: 400 });
  }
}
