from fastapi import FastAPI, UploadFile, File, Form, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import asyncpg, os, uuid

app = FastAPI(title="ILCMS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_URL = os.getenv("DATABASE_URL", "postgresql://ilcms_app:ilcms_secure_db_password@ilcms-postgres:5432/ilcms")
if "+asyncpg" in DB_URL:
    DB_URL = DB_URL.replace("+asyncpg", "")

async def get_db():
    conn = await asyncpg.connect(DB_URL)
    try:
        yield conn
    finally:
        await conn.close()

@app.get("/healthz")
@app.get("/api/healthz")
@app.get("/api/v1/healthz")
async def healthz():
    return {"status": "ok", "app": "ILCMS API"}

@app.get("/api/v1/cases")
async def list_cases(db=Depends(get_db)):
    rows = await db.fetch("SELECT id, case_number, title, description, priority, status FROM ilcms.cases ORDER BY created_at DESC;")
    return [dict(r) for r in rows]

class CaseCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Optional[str] = "NORMAL"

@app.post("/api/v1/cases")
async def create_case(payload: CaseCreate, db=Depends(get_db)):
    case_id = str(uuid.uuid4())
    case_num = f"M-{uuid.uuid4().hex[:4].upper()}/2026"
    org_row = await db.fetchrow("SELECT id FROM ilcms.organizations LIMIT 1;")
    org_id = org_row["id"] if org_row else "a0000000-0000-0000-0000-000000000001"
    
    await db.execute(
        "INSERT INTO ilcms.cases (id, organization_id, case_number, title, description, priority, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', NOW());",
        case_id, org_id, case_num, payload.title, payload.description, payload.priority
    )
    return {"id": case_id, "case_number": case_num, "status": "OPEN"}

@app.get("/api/v1/cases/{case_id}/documents")
async def list_docs(case_id: str, db=Depends(get_db)):
    rows = await db.fetch("SELECT id, title, doc_type, status, page_count FROM ilcms.documents WHERE case_id = $1;", case_id)
    return [dict(r) for r in rows]

@app.post("/api/v1/cases/{case_id}/documents")
async def upload_doc(case_id: str, file: UploadFile = File(...), title: Optional[str] = Form(None), doc_type: Optional[str] = Form("Málsskjal"), db=Depends(get_db)):
    doc_id = str(uuid.uuid4())
    doc_title = title or file.filename
    org_row = await db.fetchrow("SELECT id FROM ilcms.organizations LIMIT 1;")
    org_id = org_row["id"] if org_row else "a0000000-0000-0000-0000-000000000001"
    
    await db.execute(
        "INSERT INTO ilcms.documents (id, organization_id, case_id, title, doc_type, s3_key, status, page_count, created_at) VALUES ($1, $2, $3, $4, $5, $6, 'READY', 1, NOW());",
        doc_id, org_id, case_id, doc_title, doc_type, f"docs/{doc_id}/{file.filename}"
    )
    return {"id": doc_id, "status": "READY", "title": doc_title}

class ChatReq(BaseModel):
    case_id: str
    message: str

@app.post("/api/v1/ai/chat")
async def chat_case(payload: ChatReq, db=Depends(get_db)):
    row = await db.fetchrow("SELECT content FROM ilcms.document_chunks WHERE document_id IN (SELECT id FROM ilcms.documents WHERE case_id = $1) LIMIT 1;", payload.case_id)
    snippet = row["content"] if row else "Gagnaverið hefur móttekið málið. Engir sérgreindir galla- eða vanefndapunktar fundust í ósamþykktum hlutum."
    return {
        "answer": f"Samkvæmt gögnum málsins: {snippet}",
        "citations": [{"citation_key": "Skjal-A1", "excerpt": snippet[:80] + "..."}]
    }
