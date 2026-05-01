# LoanPilot Implementation Roadmap (Detailed)

This document outlines the granular engineering steps required to move LoanPilot from its current functional prototype to a production-grade Agentic AI loan platform.

---

## 1. Real-Time Drop-off Recovery (Primary USP)
**Gap**: Current session state is volatile (localStorage) and lacks a proactive re-engagement trigger.

### Task Breakdown:
- [ ] **DB Layer**: Create `onboarding_sessions` table in Supabase.
    - Fields: `id` (UUID), `phone_number`, `current_step`, `payload` (JSONB), `last_active_at` (TIMESTAMPTZ), `recovery_sent_at`.
- [ ] **Frontend Sync**: 
    - Implement a `useHeartbeat` hook in `page.tsx` that upserts current state to `onboarding_sessions` on every step transition.
- [ ] **WhatsApp Cloud API Integration**:
    - Call **WhatsApp Cloud API** to send a "Resume your application" message with a magic link containing the `session_id`.
- [ ] **Automation**: Set up a Supabase Cron (using `pg_cron`) to trigger the check function every minute.

---

## 2. Fraud Detection & Liveness Layer
**Gap**: No verification of physical presence, age consistency, or location during the video call.

### Task Breakdown:
- [ ] **Geolocation Verification**:
    - Add "Request Location" permission check in `InterviewRoom.tsx`.
    - Reverse geocode to check if the user is in a supported State/City.
- [ ] **AI Age Estimation**:
    - **Feature**: Estimate age from the video feed using `face-api.js` or an Edge Function.
    - **Logic**: If `estimated_age` differs from `id_card_age` by > 7 years, trigger a "High Risk" flag for manual review.
- [ ] **Agentic Liveness Challenge**:
    - AI Agent prompt: *"To verify your presence, please blink your eyes slowly or turn your head to the right."*
    - Frontend logic: Use a 5-second window to detect the specific landmark movement.

---

## 3. Financial Intelligence & Multi-Lingual STT
**Gap**: Data extraction is simple; lacks language detection (Hindi/English) and propensity scoring.

### Task Breakdown:
- [ ] **Language Detection**: 
    - Update `InterviewRoom` to detect the initial language of the user's response.
    - **Logic**: If Hindi is detected, the AI Agent switches its responses and UI labels to Hindi.
- [ ] **Structured Extraction & Propensity**: 
    - Update Gemini prompt to output `repayment_propensity` (High/Medium/Low) based on conversation signals (hesitation, clarity, tone).
- [ ] **Mock Bureau Service**:
    - Create an internal Edge Function `mock-bureau-api` to simulate CIBIL/Experian pull via PAN hash.

---

## 4. Deterministic Trust Score & Offer Engine
**Gap**: Decisions lack depth; needs Persona classification and multi-tenure offers.

### Task Breakdown:
- [ ] **Persona Classification**: 
    - Use LLM to classify user into categories: `Salaried · Urban`, `Self-Employed · Rural`, etc.
- [ ] **Scoring Algorithm Implementation**:
    - Weights: **Credit (40%)**, **Stability (30%)**, **Authenticity (30%)**.
- [ ] **Multi-Tenure Offer Generation**:
    - Generate 3 options:
        1. **Low Interest**: 12 months, Higher EMI.
        2. **Balanced**: 24 months, Standard EMI.
        3. **Flexible**: 36 months, Lower EMI.
    - **Verbal Explanation**: AI Agent speaks the offer: *"Based on your profile, I can offer you up to ₹5,00,000. Option A is..."*

---

## 5. Compliance & 7-Year Audit Vault
**Gap**: Data is mutable; lacks a secure, timestamped audit repository.

### Task Breakdown:
- [ ] **Compliance Table Setup**:
    - Create `audit_logs` table. Enable **Row Level Security (RLS)**: "Insert Only" for compliance integrity.
- [ ] **Verbal Consent Recording**: 
    - Capture the specific audio snippet where the user says "I agree" or "हाँ, मुझे मंजूर है".
    - Store this as a timestamped `.wav` file in the audit vault.
- [ ] **Secure Storage**: Move all session data to `audit-vault/{application_id}/` on completion.

---

## 6. STT Engine Upgrade (Whisper Integration)
**Gap**: Browser STT varies across devices.

### Task Breakdown:
- [ ] **Web Worker Setup**: Integrate `@xenova/transformers` for client-side **Whisper Tiny**.
- [ ] **Audio Streaming**: Pipe mic input to the Web Worker for real-time inference.

---

## Execution Timeline (3-Week Sprint)

| Week | Focus | Goals |
| :--- | :--- | :--- |
| **Week 1** | **Recovery & Language** | Sessions DB, WhatsApp Trigger, Hindi/English detection, Gemini JSON. |
| **Week 2** | **Fraud & Persona** | Geolocation, Age Estimation, Liveness, Persona Classification. |
| **Week 3** | **Offers & Audit** | Multi-tenure offers, Scoring algorithm, Consent vault, Whisper integration. |
