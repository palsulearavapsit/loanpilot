# LoanPilot: Agentic AI Loan Onboarding MVP

A full-stack production-style MVP for a secure, AI-powered loan onboarding system.

## Key Features
- **Secure KYC**: Aadhaar/PAN document validation via Gemini Vision API before pipeline starts.
- **13-Step AI Pipeline**: Full flow from document upload to loan decision with auto-fix/retry logic.
- **AI-Assisted Video KYC**: Real-time liveness (track_eye.task), emotion detection (detect_emotion.h5), face verification (detect_face.tflite), and geo-location capture.
- **Agentic AI Interview**: Dynamic loan questioning using Gemini 1.5 Pro and Whisper STT.
- **Decision Engine**: Automated risk scoring (0-100) with explainable reasoning and multi-tenure offers.
- **PWA Ready**: Installable on mobile with offline fallback support.
- **Compliance**: GDPR data export, 7-year insert-only audit vault, raw ID deleted after OCR.

---

## Tech Stack

**Frontend**: Next.js 15 (App Router), Tailwind CSS v4, Framer Motion, TypeScript.

**Backend**: Supabase (Postgres, Auth, Storage, Edge Functions).

**AI Models**:
- Document OCR & Validation: Gemini 1.5 Pro (Vision)
- Voice: Whisper STT (`@xenova/transformers`) + Google TTS
- Face Detection: `detect_face.tflite` (TFLite)
- Liveness: `track_eye.task` (MediaPipe)
- Emotion: `detect_emotion.h5`

---

## Project Structure

```text
loanpilot/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Marketing homepage
│   │   ├── auth/page.tsx               # Sign in / Sign up
│   │   ├── onboarding/page.tsx         # 4-step onboarding flow (merged pipeline)
│   │   └── admin/
│   │       ├── page.tsx                # Admin sidebar
│   │       └── dashboard/page.tsx      # Risk Control Center
│   ├── components/onboarding/
│   │   ├── DocumentValidator.tsx       # [NEW] Aadhaar/PAN selector + Gemini validation gate
│   │   ├── IDUpload.tsx                # Document upload with preview
│   │   ├── VideoSession.tsx            # [UPDATED] Live face + liveness + geo-location
│   │   ├── InterviewRoom.tsx           # AI interview with voice I/O
│   │   ├── PipelineStatusPanel.tsx     # [NEW] Live 13-step pipeline tracker UI
│   │   └── OfflineFallback.tsx         # PWA offline indicator
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase client
│   │   ├── ai-models.ts               # AI model service stubs (TFLite/MediaPipe)
│   │   └── hooks/
│   │       ├── useKYCPipeline.ts       # [NEW] 13-step pipeline hook with auto-fix/retry
│   │       └── useHeartbeat.ts         # Session state sync to DB
│   └── types/loan.ts                   # Domain models
├── supabase/
│   ├── schema.sql                      # DB schema + RLS policies
│   ├── migrations/                     # Incremental migrations
│   └── functions/
│       ├── process-id-kyc/             # Gemini OCR + age validation + delete raw ID
│       ├── calculate-loan-decision/    # Risk scoring (Credit 40% + Stability 30% + Auth 30%)
│       ├── interview-gemini/           # Agentic AI conversation
│       ├── generate-loan-pdf/          # Certificate generation
│       ├── export-user-data/           # GDPR compliance export
│       ├── send-approval-email/        # Email notifications
│       ├── whatsapp-recovery/          # Session recovery via WhatsApp
│       ├── mock-bureau-api/            # Simulated CIBIL/Experian
│       └── process-webhooks/           # External bank system integration
└── public/
    ├── models/
    │   ├── detect_face.tflite          # Face detection model
    │   ├── track_eye.task              # Eye tracking / liveness (MediaPipe)
    │   └── detect_emotion.h5          # Emotion detection model
    ├── manifest.json                   # PWA manifest
    ├── sw.js                           # Service worker
    └── whisper-worker.js               # Whisper STT Web Worker
```

---

## 13-Step KYC Pipeline (`useKYCPipeline`)

The pipeline runs in sequence with automatic retry (up to 2x) and fallback/skip logic per step.

| # | Step | Model / Service | Auto-fix |
|---|------|----------------|----------|
| 1 | Document Validation | Gemini 1.5 Pro (Vision) | Blocks pipeline if invalid |
| 2 | ID Upload + OCR | Gemini OCR Edge Function | Retry upload on failure |
| 3 | Face Extraction | `detect_face.tflite` | Retry or prompt re-upload |
| 4 | Age Validation | DOB vs estimated age | Skip with flag on mismatch |
| 5 | Delete ID | Supabase Storage | Always runs for privacy |
| 6 | Store Face Embedding | Supabase DB | Skip on failure (non-blocking) |
| 7 | Video + Geo-location | Browser Geolocation API | Fallback: geo skipped |
| 8 | Live Face Verify | `detect_face.tflite` | Fallback: flag for manual review |
| 9 | Liveness Check | `track_eye.task` | Fallback: flag for manual review |
| 10 | AI Interview + Consent | Gemini 1.5 Pro + Whisper | Retry on API error |
| 11 | Emotion Tracking | `detect_emotion.h5` | Skip on failure (soft signal) |
| 12 | Credit Decision | AI + Rules + Bureau API | Retry; fallback: UNDER_REVIEW |
| 13 | Store Audit Logs | Supabase (insert-only) | Skip on failure (non-blocking) |

**Output per run:**
```ts
{
  document_type: 'AADHAAR' | 'PAN',
  document_valid: boolean,
  step_status: Record<StepName, { status, retries, error?, data? }>,
  errors: string[],          // auto-fix log
  final_decision: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'PENDING'
}
```

---

## Document Validation Rules

**Aadhaar Card:**
- Must contain 12-digit number in format `XXXX XXXX XXXX`
- Must contain text "Government of India"

**PAN Card:**
- Must match 10-character format `ABCDE1234F`
- Must contain text "Income Tax Department"

Pipeline will NOT start if document validation fails.

---

## UI Changes (`/onboarding`)

- **Step 1** now shows `DocumentValidator` — Aadhaar/PAN selector with Gemini validation gate before upload.
- **Left sidebar** shows 4-step progress tracker + collapsible `PipelineStatusPanel` with live step statuses.
- **VideoSession** now captures geo-location, blink count, stability score, and passes all data into the pipeline.
- **Result screen** shows pipeline completion count alongside risk score and loan customizer.
- All steps animate with `framer-motion` slide transitions.

---

## Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env.local` and fill in keys:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_GEMINI_API_KEY=       # Required for document validation
   GOOGLE_VISION_API_KEY=
   ```

3. **Supabase Setup**:
   - Create a Supabase project.
   - Run `supabase/schema.sql` in the SQL Editor.
   - Deploy Edge Functions:
     ```bash
     supabase functions deploy process-id-kyc
     supabase functions deploy calculate-loan-decision
     supabase functions deploy interview-gemini
     supabase functions deploy generate-loan-pdf
     supabase functions deploy export-user-data
     ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Test Edge Functions**:
   Import `api-collection.json` into Bruno or Postman.

---

## Testing
```bash
npm test
```

---

## Known Limitations
- **Face Matching**: Uses mock embedding; integrate `face-api.js` for production comparison.
- **Liveness**: Canvas-based simulation; upgrade to 3D depth maps or active IR for high security.
- **TFLite / MediaPipe**: `ai-models.ts` stubs return mock values — wire real model inference for production.
- **Email / WhatsApp**: Edge functions return mocked responses.
- **PDF Generation**: Returns JSON; replace with a real PDF library (e.g. `pdf-lib`).
