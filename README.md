# LoanPilot: Agentic AI Loan Onboarding MVP

A full-stack production-style MVP for a secure, AI-powered loan onboarding system.

## 🚀 Key Features
- **Secure KYC**: Automatic ID parsing (Aadhaar/PAN) using Google Vision.
- **AI-Assisted Video Call**: Real-time liveness, emotion detection, and face verification.
- **Agentic AI Interview**: Dynamic loan questioning using Gemini 1.5 Pro and Whisper STT.
- **Decision Engine**: Automated risk scoring (0-100) with explainable reasoning.
- **PWA Ready**: Installable on mobile with offline fallback support.

## 🛠 Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Framer Motion, TypeScript.
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions).
- **AI Models**: 
  - OCR: Google Vision API
  - Voice: Whisper (STT) + Google TTS
  - Reasoning: Gemini 1.5 Pro
  - Client-side: TensorFlow.js (Face/Liveness/Emotion)

## 📦 Project Structure
```text
loanpilot/
├── src/
│   ├── app/                # Next.js Routes
│   ├── components/         # UI Components (Atomic Design)
│   ├── lib/                # Shared Utilities (Supabase, AI)
│   └── types/              # Domain Models
├── supabase/
│   ├── functions/          # Edge Functions (ID KYC, Decision Engine)
│   └── schema.sql          # DB Migrations & RLS
└── public/                 # Static Assets & Manifest
```

## 🚦 Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env.local` and fill in your keys.

3. **Supabase Setup**:
   - Create a new Supabase project.
   - Run the SQL in `supabase/schema.sql` in the SQL Editor.
   - Seed demo data using `supabase/seed.sql`.
   - Deploy Edge Functions using Supabase CLI:
     ```bash
     supabase functions deploy process-id-kyc
     supabase functions deploy calculate-loan-decision
     ```

4. **Testing with Bruno/Postman**:
   Import `api-collection.json` into Bruno or Postman to test the Edge Functions directly.

5. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🧪 Testing
Run the following to execute unit tests for the decision engine:
```bash
npm test
```

## ⚠️ Limitations & Improvements
- **Face Matching**: Currently uses a mock embedding match; integrate `face-api.js` for production comparison.
- **Liveness**: Basic challenge/response; upgrade to 3D depth maps or active infra-red for high-security.
- **Data Privacy**: Raw images are deleted, but ensure GDPR compliance by adding a dedicated user data export endpoint.
