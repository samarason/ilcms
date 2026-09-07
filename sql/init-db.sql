-- ILCMS Air-Gapped Database Schema with pgvector
-- Target: PostgreSQL 16+ with pgvector extension enabled

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Cases Table
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'NORMAL',
    status VARCHAR(20) DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_path TEXT,
    doc_type VARCHAR(50) DEFAULT 'Málsskjal',
    status VARCHAR(50) DEFAULT 'READY',
    page_count INTEGER DEFAULT 1,
    checksum VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Document Chunks with Vector Embeddings (768 dimensions for nomic-embed-text / bge)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    page_number INTEGER,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create HNSW Vector Index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- Index for filtering by case_id
CREATE INDEX IF NOT EXISTS idx_document_chunks_case_id 
ON document_chunks(case_id);

-- 5. Helper Function: Semantic Search within a specific legal case
CREATE OR REPLACE FUNCTION search_case_chunks(
    p_case_id UUID,
    p_query_embedding vector(768),
    p_match_count INT DEFAULT 5
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    document_title VARCHAR,
    chunk_text TEXT,
    page_number INT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id AS chunk_id,
        dc.document_id,
        d.title AS document_title,
        dc.chunk_text,
        dc.page_number,
        1 - (dc.embedding <=> p_query_embedding) AS similarity
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE dc.case_id = p_case_id
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;

-- Seed initial test cases and documents
INSERT INTO cases (id, case_number, title, description, priority, status)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'M-4821/2026', 'Málflutningur vegna fasteignagalla', 'Ágreiningur um leynda galla við sölu á einbýlishúsi í Garðabæ. Raka- og mygluskemmdir komu í ljós eftir afhendingu.', 'NORMAL', 'OPEN'),
    ('22222222-2222-2222-2222-222222222222', 'M-1940/2026', 'Vinnuréttardeila og uppsögn', 'Krafa um bótagreiðslur og vangoldin laun vegna ólögmætrar riftunar ráðningarsamnings sérfræðings.', 'HIGH', 'OPEN'),
    ('33333333-3333-3333-3333-333333333333', 'M-8312/2026', 'Samningsbrot í verktakagreiðslum', 'Krafa aðalverktaka um greiðslu viðbótarverka við byggingu atvinnuhúsnæðis á höfuðborgarsvæðinu.', 'NORMAL', 'OPEN')
ON CONFLICT (case_number) DO NOTHING;

INSERT INTO documents (id, case_id, title, doc_type, status, page_count)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Kaupsamningur_og_afsöl.pdf', 'Málsskjal', 'READY', 12),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Matsskýrsla_verkfræðings_byggingargallar.pdf', 'Málsskjal', 'READY', 24),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Ráðningarsamningur_2023.pdf', 'Málsskjal', 'READY', 5)
ON CONFLICT DO NOTHING;

-- 6. Legal Statutes Table (Íslenskt lagasafn)
CREATE TABLE IF NOT EXISTS legal_statutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    act_name VARCHAR(255) NOT NULL,
    act_number VARCHAR(50) NOT NULL,
    article VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    statute_text TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_legal_statutes_embedding_hnsw
ON legal_statutes USING hnsw (embedding vector_cosine_ops);

-- 7. Legal Precedents Table (Dómasafn Hæstaréttar og Landsréttar)
CREATE TABLE IF NOT EXISTS legal_precedents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court VARCHAR(50) NOT NULL,
    case_reference VARCHAR(50) UNIQUE NOT NULL,
    decision_date DATE NOT NULL,
    parties VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    statutory_basis TEXT[] NOT NULL,
    key_findings TEXT NOT NULL,
    full_excerpt TEXT NOT NULL,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_legal_precedents_embedding_hnsw
ON legal_precedents USING hnsw (embedding vector_cosine_ops);

-- Seed Precedent Rulings
INSERT INTO legal_precedents (court, case_reference, decision_date, parties, summary, statutory_basis, key_findings, full_excerpt)
VALUES 
    (
        'Hæstiréttur',
        'Hrd. 120/2021',
        '2021-11-18',
        'Kaupendur einbýlishúss gegn Seljendum',
        'Deilt um leyndan rakagalla og myglu í þaki og útveggjum. Seljandi bar fyrir sig tómlæti skv. 27. gr. laga nr. 40/2002.',
        ARRAY['27. gr. laga nr. 40/2002', '17. gr. laga nr. 40/2002', '40. gr. laga nr. 40/2002'],
        'Hæstiréttur komst að þeirri niðurstöðu að tilkynning kaupenda tæpum tveimur mánuðum eftir skoðun fagaðila teldist gerð án ástæðulauss dráttar. Dæmdur 8,5 m.kr. afsláttur.',
        'Í dómi Hæstaréttar: Í ljósi eðlis leyndra galla var eðlilegt að kaupendur aflað sérfræðilegrar ráðgjafar áður en aðfinnslur voru formlega settar fram. Tilkynningin var því innan sanngjarns frests skv. 27. gr. laga nr. 40/2002.'
    ),
    (
        'Landsréttur',
        'Landsréttur 45/2023',
        '2023-04-12',
        'Verktakafyrirtæki gegn Verkkaupa',
        'Krafa um frávísun máls vegna þess að 14 sólarhringa lágmarksstefnufrestur skv. 80. gr. laga nr. 91/1991 var ekki virtur.',
        ARRAY['80. gr. 1. mgr. laga nr. 91/1991', '116. gr. laga nr. 91/1991'],
        'Ófrávíkjanleg réttarfarsregla. Þar sem stefndi bjó í öðru umdæmi var 5 daga frestur ófullnægjandi og bar að vísa málinu frá dómi.',
        'Ákvæði 1. mgr. 80. gr. laga nr. 91/1991 um 14 sólarhringa stefnufrest er ófrávíkjanlegt réttaröryggisákvæði sem dómara ber að gæta ex officio.'
    ),
    (
        'Hæstiréttur',
        'Hrd. 412/2019',
        '2019-10-24',
        'Fyrrverandi fjármálastjóri gegn Félagi ehf.',
        'Riftun ráðningarsamnings án fyrirvara. Félaginu gert að greiða laun út samningsbundinn 6 mánaða uppsagnarfrest.',
        ARRAY['Lög nr. 19/1979 um rétt verkafólks til uppsagnarfrests', 'Vinnuréttarreglur'],
        'Riftun er íþyngjandi úrræði sem krefst ásetnings eða stórfelldra vanefnda. Slíkt var ekki sannað og bar að virða samningsbundinn uppsagnarfrest.',
        'Riftun á ráðningarsamningi er íþyngjandi úrræði sem aðeins má beita við verulegar og ásetningslegar vanefndir.'
    ),
    (
        'Hæstiréttur',
        'Hrd. 58/2020',
        '2020-03-05',
        'Byggingarverktaki gegn Húsfélagi',
        'Krafa verktaka um greiðslu viðbótarverka hafnað þar sem skriflegt samþykki eða sönnun um pöntun aukavinnu lá ekki fyrir.',
        ARRAY['ÍST 30', 'Samningalög nr. 7/1936'],
        'Sönnunarbyrði um að verkkaupi hafi samþykkt aukakostnað hvílir á verktaka.',
        'Sá sem krefst greiðslu fyrir aukavinnu umfram verksamning verður að sýna fram á að verkið hafi verið pantað með sannanlegum hætti.'
    )
ON CONFLICT (case_reference) DO NOTHING;

-- Seed Statutes
INSERT INTO legal_statutes (act_name, act_number, article, title, statute_text, category)
VALUES
    ('Lög um meðferð einkamála', 'nr. 91/1991', '80. gr.', 'Stefnufrestur og birting stefnu', 'Stefnufrestur skal vera minnst þrír sólarhringar í sama dómumdæmi, 14 sólarhringar annars staðar á landinu, einn mánuður í Evrópu og þrír mánuðir utan Evrópu.', 'einkamálaréttur'),
    ('Lög um meðferð einkamála', 'nr. 91/1991', '81. gr.', 'Dómhlé (Sumardómhlé og jól)', 'Frá 15. júlí til 15. ágúst og 24. des til 1. janúar eru dómhlé. Stefnur verða ekki þingfestar nema brýn nauðsyn krefji.', 'einkamálaréttur'),
    ('Lög um meðferð einkamála', 'nr. 91/1991', '97. gr.', 'Greinargerðarfrestur stefnda', 'Dómari gefur stefnda jafnan frest til að leggja fram skriflega greinargerð við þingfestingu, jafnan allt að fjórar vikur.', 'einkamálaréttur'),
    ('Lög um meðferð einkamála', 'nr. 91/1991', '115. gr.', 'Dómsuppkvaðningarfrestur', 'Dómur skal kveðinn upp eigi síðar en fjórum vikum frá því að málflutningi lauk.', 'einkamálaréttur'),
    ('Lög um meðferð einkamála', 'nr. 91/1991', '143. gr.', 'Áfrýjunarfrestur til Landsréttar', 'Áfrýjunarfrestur til Landsréttar er fjórar vikur frá uppkvaðningu héraðsdóms.', 'einkamálaréttur'),
    ('Lög um fasteignakaup', 'nr. 40/2002', '17. gr.', 'Galli á fasteign (Meginregla)', 'Fasteign telst gölluð ef hún svarar ekki til þeirra krafna sem leiða af samningi eða er í verulega verra ástandi en kaupandi mátti ætla.', 'fasteignaréttur'),
    ('Lög um fasteignakaup', 'nr. 40/2002', '27. gr.', 'Tilkynningarskylda kaupanda', 'Kaupandi glatar rétti til að bera fyrir sig galla ef hann tilkynnir seljanda ekki um hann án ástæðulauss dráttar (innan sanngjarns frests).', 'fasteignaréttur'),
    ('Lög um fasteignakaup', 'nr. 40/2002', '40. gr.', 'Afsláttur af kaupverði vegna galla', 'Sé fasteign gölluð á kaupandi rétt á hlutfallslegum afslætti af kaupverði miðað við mismun á verðmæti.', 'fasteignaréttur')
ON CONFLICT DO NOTHING;
