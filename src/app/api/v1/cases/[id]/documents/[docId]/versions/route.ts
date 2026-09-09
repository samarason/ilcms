import { NextResponse } from "next/server";
import { docsStore, DocumentVersion } from "@/lib/store";
import { extractTextFromPdf } from "@/lib/pdfExtractor";
import { extractTextFromDocx, isDocxBuffer } from "@/lib/docxExtractor";

export async function GET(
  request: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const { id: caseId, docId } = params;
  const doc = docsStore.find((d) => d.id === docId && d.case_id === caseId);

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Ensure versions array is initialized
  if (!doc.versions || doc.versions.length === 0) {
    doc.versions = [
      {
        id: `v-${doc.id}-1`,
        version_number: 1,
        created_at: doc.created_at,
        author: doc.author || "Málsaðili / Lögmaður",
        change_summary: "Upphafleg útgáfa lögð fram í dómþingi",
        title: doc.title,
        content: doc.content || "",
        page_count: doc.page_count,
        is_pdf: doc.is_pdf,
        pdf_data_url: doc.pdf_data_url,
        file_size: doc.file_size,
      },
    ];
    doc.version = 1;
  }

  return NextResponse.json({
    doc_id: doc.id,
    current_version: doc.version || doc.versions.length,
    versions: doc.versions,
  });
}

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

    // Ensure versions array exists
    if (!doc.versions || doc.versions.length === 0) {
      doc.versions = [
        {
          id: `v-${doc.id}-1`,
          version_number: 1,
          created_at: doc.created_at,
          author: doc.author || "Málsaðili / Lögmaður",
          change_summary: "Upphafleg útgáfa lögð fram í dómþingi",
          title: doc.title,
          content: doc.content || "",
          page_count: doc.page_count,
          is_pdf: doc.is_pdf,
          pdf_data_url: doc.pdf_data_url,
          file_size: doc.file_size,
        },
      ];
      doc.version = 1;
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const changeSummary = (formData.get("change_summary") as string | null) || "";
    const author = (formData.get("author") as string | null) || "Guðrún Sigurðardóttir hrl.";
    const titleForm = formData.get("title") as string | null;

    let fileContent = doc.content || "";
    let htmlContent = doc.html_content;
    let pageCount = doc.page_count || 1;
    let isPdf = doc.is_pdf || false;
    let isDocx = doc.is_docx || false;
    let pdfDataUrl = doc.pdf_data_url;
    let docxDataUrl = doc.docx_data_url;
    let fileSize = doc.file_size;
    const newTitle = titleForm || (file ? file.name : doc.title);

    if (file) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fileSize = buffer.length;

        const fileNameLower = (file.name || "").toLowerCase();
        const isPdfFile =
          file.type === "application/pdf" ||
          fileNameLower.endsWith(".pdf") ||
          buffer.subarray(0, 10).toString("ascii").includes("%PDF-");

        const isDocxFile =
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          fileNameLower.endsWith(".docx") ||
          fileNameLower.endsWith(".docm") ||
          fileNameLower.endsWith(".dotx") ||
          (isDocxBuffer(buffer) && buffer.toString("binary", 0, 300).includes("[Content_Types].xml"));

        if (isPdfFile) {
          isPdf = true;
          isDocx = false;
          docxDataUrl = undefined;
          htmlContent = undefined;
          pdfDataUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;
          const extraction = await extractTextFromPdf(buffer);
          fileContent = extraction.text;
          pageCount = Math.max(1, extraction.pageCount);
        } else if (isDocxFile) {
          isDocx = true;
          isPdf = false;
          pdfDataUrl = undefined;
          docxDataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${buffer.toString("base64")}`;
          const extraction = await extractTextFromDocx(buffer);
          fileContent = extraction.text;
          htmlContent = extraction.html;
          pageCount = Math.max(1, extraction.pageCount);
        } else {
          fileContent = buffer.toString("utf-8");
          pageCount = Math.max(1, Math.ceil(fileContent.length / 1500));
        }
      } catch (err) {
        console.error("Error reading file for new version:", err);
      }
    }

    const highestVersion = doc.versions.reduce(
      (max, v) => Math.max(max, v.version_number),
      doc.version || 1
    );
    const nextVersionNum = highestVersion + 1;

    const newVersion: DocumentVersion = {
      id: "v-" + Math.random().toString(36).substring(2, 9),
      version_number: nextVersionNum,
      created_at: new Date().toISOString(),
      author,
      change_summary: changeSummary.trim() || `Endurskoðuð útgáfa v${nextVersionNum}`,
      title: newTitle,
      content: fileContent,
      page_count: pageCount,
      is_pdf: isPdf,
      pdf_data_url: pdfDataUrl,
      is_docx: isDocx,
      docx_data_url: docxDataUrl,
      html_content: htmlContent,
      file_size: fileSize,
    };

    doc.versions.push(newVersion);
    doc.version = nextVersionNum;
    doc.updated_at = newVersion.created_at;
    doc.title = newTitle;
    doc.content = fileContent;
    doc.html_content = htmlContent;
    doc.page_count = pageCount;
    doc.is_pdf = isPdf;
    doc.pdf_data_url = pdfDataUrl;
    doc.is_docx = isDocx;
    doc.docx_data_url = docxDataUrl;
    doc.file_size = fileSize;
    if (isDocx) {
      doc.doc_type = "Dómaskjal (Word DOCX)";
    } else if (isPdf) {
      doc.doc_type = "Dómaskjal (PDF)";
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
      doc,
    });
  } catch (error) {
    console.error("Error uploading new document version:", error);
    return NextResponse.json({ error: "Failed to upload revision" }, { status: 400 });
  }
}
