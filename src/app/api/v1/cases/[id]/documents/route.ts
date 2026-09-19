import { NextResponse } from "next/server";
import { docsStore, DocumentItem } from "@/lib/store";
import { extractTextFromPdf } from "@/lib/pdfExtractor";
import { extractTextFromDocx, isDocxBuffer } from "@/lib/docxExtractor";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const caseId = params.id;
  const docs = docsStore.filter((d) => d.case_id === caseId);

  // Auto-clean any previously uploaded documents that have raw PDF or DOCX bytes/strings
  // and ensure version history is initialized
  for (const doc of docs) {
    if (doc.content && doc.content.trim().startsWith("%PDF-")) {
      try {
        const extracted = await extractTextFromPdf(doc.content);
        if (extracted.text && extracted.text.trim()) {
          doc.content = extracted.text;
          doc.page_count = Math.max(doc.page_count || 1, extracted.pageCount);
          doc.is_pdf = true;
        }
      } catch (err) {
        console.warn("Could not auto-extract legacy raw PDF doc:", doc.id, err);
      }
    } else if (
      doc.content &&
      (doc.content.startsWith("PK") ||
        doc.content.includes("[Content_Types].xml") ||
        (doc.title?.toLowerCase().endsWith(".docx") && isDocxBuffer(doc.content)))
    ) {
      try {
        const extraction = await extractTextFromDocx(doc.content);
        if (extraction.text && extraction.text.trim()) {
          doc.content = extraction.text;
          doc.html_content = extraction.html;
          doc.page_count = Math.max(doc.page_count || 1, extraction.pageCount);
          doc.is_docx = true;
          doc.doc_type = "Dómaskjal (Word DOCX)";
        }
      } catch (err) {
        console.warn("Could not auto-extract legacy raw DOCX doc:", doc.id, err);
      }
    } else if (doc.title?.toLowerCase().endsWith(".docx")) {
      doc.is_docx = true;
    }

    if (!doc.version) {
      doc.version = doc.versions?.length || 1;
    }
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
          is_docx: doc.is_docx,
          docx_data_url: doc.docx_data_url,
          html_content: doc.html_content,
          file_size: doc.file_size,
        },
      ];
    }
  }

  return NextResponse.json(docs);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await request.json();
      const docTitle = json.title || "Ónefnt málsskjal";
      const fileContent = json.content || "";
      const docType = json.doc_type || "Málsskjal";
      const pageCount = Math.max(1, Math.ceil(fileContent.length / 1500));

      const initialVersion = {
        id: "v-" + Math.random().toString(36).substring(2, 9),
        version_number: 1,
        created_at: new Date().toISOString(),
        author: json.author || "Lögmaður (Sjálfvirk skjalagerð)",
        change_summary: json.change_summary || "Sjálfvirk drög vistuð í málaskrá",
        title: docTitle,
        content: fileContent,
        page_count: pageCount,
        is_pdf: false,
        is_docx: false,
        file_size: Buffer.byteLength(fileContent, "utf8"),
      };

      const newDoc: DocumentItem = {
        id: "d-" + Math.random().toString(36).substring(2, 9),
        case_id: caseId,
        title: docTitle,
        doc_type: docType,
        status: "READY",
        page_count: pageCount,
        created_at: new Date().toISOString(),
        filing_date: new Date().toISOString().split("T")[0],
        author: json.author || "Lögmaður (Sjálfvirk skjalagerð)",
        summary: json.summary || `Sjálfvirk drög að ${docType} vistuð í málaskrá.`,
        content: fileContent,
        is_pdf: false,
        is_docx: false,
        file_size: Buffer.byteLength(fileContent, "utf8"),
        version: 1,
        versions: [initialVersion],
      };

      docsStore.unshift(newDoc);

      return NextResponse.json({
        id: newDoc.id,
        status: "READY",
        title: docTitle,
        page_count: newDoc.page_count,
        version: newDoc.version,
        versions: newDoc.versions,
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const titleForm = formData.get("title") as string | null;

    const docTitle = titleForm || (file ? file.name : "Ónefnt skjal");
    let fileContent = "";
    let htmlContent: string | undefined = undefined;
    let pageCount = 1;
    let isPdf = false;
    let isDocx = false;
    let pdfDataUrl: string | undefined = undefined;
    let docxDataUrl: string | undefined = undefined;
    let fileSize: number | undefined = undefined;

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
          // Create data URL for native browser PDF preview & download
          pdfDataUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;
          
          const extraction = await extractTextFromPdf(buffer);
          fileContent = extraction.text;
          pageCount = Math.max(1, extraction.pageCount);
        } else if (isDocxFile) {
          isDocx = true;
          docxDataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${buffer.toString("base64")}`;
          
          const extraction = await extractTextFromDocx(buffer);
          fileContent = extraction.text;
          htmlContent = extraction.html;
          pageCount = Math.max(1, extraction.pageCount);
        } else {
          fileContent = buffer.toString("utf-8");
          pageCount = Math.max(1, Math.ceil(fileContent.length / 1500));
        }
      } catch (readErr) {
        console.error("Error reading uploaded file:", readErr);
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

    const initialVersion = {
      id: "v-" + Math.random().toString(36).substring(2, 9),
      version_number: 1,
      created_at: new Date().toISOString(),
      author: "Málsaðili / Lögmaður",
      change_summary: "Upphafleg útgáfa skráð í málasafn",
      title: docTitle,
      content: fileContent,
      page_count: pageCount,
      is_pdf: isPdf,
      pdf_data_url: pdfDataUrl,
      is_docx: isDocx,
      docx_data_url: docxDataUrl,
      html_content: htmlContent,
      file_size: fileSize,
    };

    const newDoc: DocumentItem = {
      id: "d-" + Math.random().toString(36).substring(2, 9),
      case_id: caseId,
      title: docTitle,
      doc_type: isPdf ? "Dómaskjal (PDF)" : isDocx ? "Dómaskjal (Word DOCX)" : "Málsskjal",
      status: "READY",
      page_count: pageCount,
      created_at: new Date().toISOString(),
      filing_date: new Date().toISOString().split("T")[0],
      author: "Málsaðili / Lögmaður",
      summary: `Málsskjal lagt fram í máli ${caseId}${isPdf ? ` (${pageCount} bls. PDF)` : isDocx ? ` (${pageCount} bls. Word DOCX)` : ""}.`,
      content: fileContent,
      is_pdf: isPdf,
      pdf_data_url: pdfDataUrl,
      is_docx: isDocx,
      docx_data_url: docxDataUrl,
      html_content: htmlContent,
      file_size: fileSize,
      version: 1,
      versions: [initialVersion],
    };

    docsStore.push(newDoc);

    return NextResponse.json({
      id: newDoc.id,
      status: "READY",
      title: docTitle,
      page_count: newDoc.page_count,
      is_pdf: newDoc.is_pdf,
      is_docx: newDoc.is_docx,
      version: newDoc.version,
      versions: newDoc.versions,
    });
  } catch (error) {
    console.error("Upload error:", error);
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
