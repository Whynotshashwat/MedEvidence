# MedEvidence

**Cryptographically proven AI clinical recommendations with tamper detection.**

MedEvidence is a medical evidence system that uses the [CooL SDK](https://github.com/Northwind-Cipher/cool-sdk) (`cool-nwc` npm package) to create cryptographically signed evidence receipts for AI clinical recommendations. It provides tamper detection, persistent storage, patient/case management, and a full audit trail.

---

## The Problem

AI-generated clinical recommendations (e.g., triage scoring, diagnostic suggestions) face a critical trust problem:

- **How do you prove an AI recommendation existed at a specific point in time?**
- **How do you detect if someone altered the recommendation after the fact?**
- **How do you provide cryptographic evidence for legal/compliance review?**

In healthcare, post-hoc modification of clinical records — whether accidental or malicious — can have life-threatening consequences. Existing systems rely on database audit logs that can themselves be tampered with.

## The Solution

MedEvidence solves this by creating **cryptographic evidence receipts** using the CooL SDK every time an AI model generates a recommendation. The system then uses a **two-layer verification** approach:

1. **CooL SDK verification** (`verifyEvidence(evidence)`) — validates the cryptographic integrity of the receipt (signature, attestation, enclave)
2. **Binding hash verification** — recomputes a SHA-256 hash of the current EHR data (vitals + recommendation) and compares it against the hash stored at creation time

If either check fails, the evidence is flagged as tampered. This makes it mathematically provable whether a recommendation was modified after creation.

---

## How CooL SDK Is Used

### Evidence Recording (`cool.record()`)

When a new case is created and the AI model generates a recommendation, the system calls:

```js
const { evidence, recordId, executionId, digest } = await cool.record({
  type: "model.execution",
  metadata: {
    model: "medevidence-triage-v1",
    caseNumber,
    patient_mrn: patient.mrn,
    timestamp: new Date().toISOString(),
  },
  payloads: {
    input: JSON.stringify(vitals),
    output: JSON.stringify(recommendation),
  },
  software: { name: "medevidence-triage", version: "2.0.0", digest: null },
});
```

This produces a signed evidence receipt that is stored in SQLite alongside the case data.

### Evidence Verification (`verifyEvidence()`)

When verifying a case, the system:

```js
const evidence = JSON.parse(evRow.evidence_json);
const verdict = await verifyEvidence(evidence);

// Then overlays binding check
const currentHash = computeBindingHash(currentVitals, currentRecommendation);
if (currentHash !== storedBindingHash) {
  verdict.ok = false;
  verdict.checks.binding = { status: "fail", detail: "Data binding mismatch" };
}
```

### Why CooL Matters

| Without CooL | With CooL |
|---|---|
| Audit logs can be modified | Cryptographic receipts are tamper-evident |
| No proof of model execution | Signed evidence with execution metadata |
| Database-level integrity only | SDK-level cryptographic verification |
| No attestation chain | CooL provides attestation and enclave checks |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (SPA)                │
│  Vanilla JS · Dark/Light Healthcare Theme       │
│  Dashboard · Patients · Cases · Audit Log       │
└──────────────────────┬──────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────┐
│              Express 5 Backend                  │
│  Auth (JWT) · RBAC · Rate Limiting · CORS       │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Patients  │  │  Cases   │  │  Evidence    │  │
│  │ CRUD      │  │ CRUD +   │  │  Records     │  │
│  │           │  │ Triage   │  │  (CooL SDK)  │  │
│  └──────────┘  └────┬─────┘  └──────────────┘  │
│                     │                            │
│              ┌──────▼──────┐                    │
│              │  Mock AI    │                    │
│              │  Model      │                    │
│              │  (Triage)   │                    │
│              └──────┬──────┘                    │
│                     │                            │
│              ┌──────▼──────┐  ┌──────────────┐  │
│              │  CooL SDK   │  │  SQLite DB   │  │
│              │  cool.record│  │  7 Tables    │  │
│              │  verifyEv.  │  │  WAL Mode    │  │
│              └─────────────┘  └──────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Audit Middleware · Binding Hash (SHA-256) │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### Workflow

1. **Login** — JWT authentication with role-based access (admin, superadmin, doctor, nurse, auditor)
2. **Create Patient** — Register patient with MRN, demographics (with edit support)
3. **Run Triage** — Enter vitals → Mock AI model scores severity → CooL SDK records evidence receipt
4. **Verify Evidence** — Two-layer check: CooL cryptographic integrity + binding hash recomputation
5. **View Coded Receipt** — Structured display of the full CooL evidence receipt (schema, record, signatures, attestation, key directory)
6. **Simulate Tamper** — Mutate stored data → Verify detects the change (binding hash fails)
7. **User Management** — Admin/superadmin can create and delete users with auto-generated credentials
8. **Audit Trail** — Every action logged with user, timestamp, IP, and details
9. **Dark/Light Mode** — Toggle between healthcare-friendly light and dark themes (persisted in localStorage)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JS SPA, Inter font, Font Awesome icons |
| **Backend** | Node.js ESM, Express 5 |
| **Database** | SQLite via `better-sqlite3` (WAL mode) |
| **Auth** | JWT (`jsonwebtoken`), bcrypt (`bcryptjs`) |
| **Evidence** | CooL SDK (`cool-nwc@3.0.0`) |
| **Security** | Helmet, CORS, rate limiting, RBAC |
| **Deployment** | Node.js 20+ |

---

## Deployment

### Default Users

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | admin |
| `dr.jones` | `doc123` | doctor |
| `nurse.lee` | `nurse123` | nurse |
| `auditor` | `audit123` | auditor |
| `superadmin` | `shashwat` | superadmin (hidden, undeletable) |

### Run Tests

```bash
node test.mjs
```

Requires the server to be running on `localhost:3000`.

### Database Schema

7 tables with foreign keys and indexes:

- **users** — Authentication and roles
- **patients** — Patient demographics (MRN, name, DOB, sex)
- **cases** — Clinical cases with status tracking
- **vitals** — Vital signs per case (HR, RR, Temp, BP)
- **recommendations** — AI model output (score, recommendation text)
- **evidence** — CooL SDK receipts (record_id, execution_id, digest, evidence_json, binding_hash)
- **audit_log** — Complete action trail

### Security Features

- **JWT authentication** with configurable expiry
- **Role-based access control** (admin, superadmin, doctor, nurse, auditor)
- **Rate limiting** on login (60 requests / minute) and globally (200 requests / 15 minutes)
- **CORS** restricted in production
- **Helmet** security headers
- **Input validation** on vitals (physiological range checks)
- **SQL injection protection** via parameterized queries
- **XSS prevention** via safe DOM creation (no innerHTML interpolation)
- **JWT_SECRET required** in production (crashes if not set)
- **Superadmin** hidden from user list, undeletable, full admin access

---

### Local Development

```bash
git clone https://github.com/Whynotshashwat/MedEvidence.git
cd MedEvidence
npm install
npm run dev
```

Open http://localhost:3000

### Render (Production)

The app includes a `render.yaml` Blueprint and `Dockerfile` for one-click deployment:

1. Fork the repository
2. Connect your GitHub repo to Render
3. Render auto-detects `render.yaml` and builds the Docker image
4. Set `JWT_SECRET` in Render's Environment tab (the pinned value in `render.yaml` works for demos)

> **Note:** Render free tier uses ephemeral disk — patient/case data is lost on service restart. Upgrade to a paid plan with persistent disk for data retention.

### Docker

```bash
docker build -t medevidence .
docker run -p 3000:3000 -e JWT_SECRET=your-secret-here medevidence
```

---

## Technical Decisions

| Decision | Rationale |
|---|---|
| **CooL SDK for evidence** | Provides cryptographic receipts with attestation chains — stronger than database-level audit logs alone |
| **Two-layer verification** | CooL checks cryptographic integrity; binding hash checks EHR data integrity. Both are needed for full assurance |
| **SQLite + WAL mode** | Simple deployment, no external DB dependency. WAL mode allows concurrent reads during writes |
| **Express 5** | Latest Express with native async error handling and modern path matching |
| **Vanilla JS SPA** | No build step, no framework dependency. Fast to develop, easy to deploy |
| **JWT in localStorage** | Simpler than httpOnly cookies for a demo app. Production would use cookies + CSRF |
| **Mock AI model** | Rule-based triage scoring. The focus is on the evidence infrastructure, not the model |

---

## Limitations & Future Improvements

**Current limitations:**
- CooL SDK runs in simulated mode (no real TEE/attestation)
- Mock AI model (rule-based triage scoring)
- SQLite (not suitable for high-concurrency production)
- No WebSocket for real-time updates
- No case delete (intentional for evidence integrity)
- Render free tier: data lost on restart (ephemeral disk)

**Future improvements:**
- Replace mock model with real ML inference
- Real CooL SDK attestation with TEE
- PostgreSQL for production deployment
- Persistent storage on Render (paid plan with disk)
- Case notes/comments
- PDF evidence export
- Email notifications for escalated cases
- Two-factor authentication
- API documentation (OpenAPI/Swagger)
- Token refresh for extended sessions
