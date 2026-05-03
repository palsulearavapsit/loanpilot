'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentValidator, DocType } from '@/components/onboarding/DocumentValidator';
import { VideoSession, VideoSessionData } from '@/components/onboarding/VideoSession';
import { InterviewRoom } from '@/components/onboarding/InterviewRoom';
import { PipelineStatusPanel } from '@/components/onboarding/PipelineStatusPanel';
import { OfflineFallback } from '@/components/onboarding/OfflineFallback';
import { useKYCPipeline } from '@/lib/hooks/useKYCPipeline';
import { useHeartbeat } from '@/lib/hooks/useHeartbeat';
import { createClient } from '@/lib/supabase';
import { Shield, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import confetti from 'canvas-confetti';

type Step = 'ID_UPLOAD' | 'VIDEO_KYC' | 'INTERVIEW' | 'RESULT';

const STEPS: Step[] = ['ID_UPLOAD', 'VIDEO_KYC', 'INTERVIEW', 'RESULT'];

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('ID_UPLOAD');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [decisionData, setDecisionData] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState(100000);
  const [customTenure, setCustomTenure] = useState(12);
  const [showPipeline, setShowPipeline] = useState(false);

  // Validation state (Step 1 gate)
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; docType: DocType } | null>(null);

  const pipeline = useKYCPipeline();
  useHeartbeat(sessionId, step, { applicationId });

  // Restore session from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem('kyc_done');
    if (savedId) {
      setApplicationId(savedId);
      setStep('VIDEO_KYC');
      initSession(savedId);
    }
  }, []);

  const initSession = async (appId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('onboarding_sessions')
      .insert({ application_id: appId })
      .select()
      .single();
    if (!error && data) setSessionId(data.id);
  };

  // ── STEP 1: Doc Validate → OCR ────────────────────────────────────────────
  const handleDocumentValidated = async (file: File, docType: DocType) => {
    setIsValidating(true);
    setValidationError(undefined);
    setValidationSuccess(false);
    setPendingFile({ file, docType });
    setShowPipeline(true);

    // Gate 1: Gemini document validation
    const valid = await pipeline.runDocumentValidation(file, docType, GEMINI_KEY);

    if (!valid) {
      setValidationError(
        pipeline.output.errors.at(-1) ?? 'Invalid document. Please upload a valid Aadhaar or PAN card.'
      );
      setIsValidating(false);
      return;
    }

    setValidationSuccess(true);

    // Gate 2: Upload + OCR pipeline
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setValidationError('You must be logged in to continue.');
      setIsValidating(false);
      return;
    }

    const appId = await pipeline.runIDUploadOCR(file, docType, user.id);
    if (!appId) {
      setValidationError('ID processing failed. Please try again.');
      setIsValidating(false);
      return;
    }

    setApplicationId(appId);
    localStorage.setItem('kyc_done', appId);
    await initSession(appId);
    setIsValidating(false);
    setStep('VIDEO_KYC');
  };

  // ── STEP 2: Video KYC ─────────────────────────────────────────────────────
  const handleVideoComplete = async (data: VideoSessionData) => {
    if (!applicationId) return;

    await pipeline.runVideoKYC(applicationId, {
      emotion_avg: data.emotion_avg,
      liveness_score: data.liveness_score,
      estimated_age: data.estimated_age,
      stability_score: data.stability_score,
      geolocation: data.geolocation,
    });

    setStep('INTERVIEW');
  };

  // ── STEP 3: Interview + Decision ─────────────────────────────────────────
  const handleInterviewComplete = async () => {
    if (!applicationId) return;

    const decision = await pipeline.runInterviewAndDecision(applicationId);

    // Also fetch full decision data for the result card
    try {
      const supabase = createClient();
      const { data } = await supabase.functions.invoke('calculate-loan-decision', {
        body: { application_id: applicationId },
      });
      setDecisionData(data);
    } catch {
      setDecisionData({ status: decision, score: 72 });
    }

    setStep('RESULT');
    if (decision === 'APPROVED') {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#EFC86E', '#D4AF37', '#D39B2A'] });
    }
  };

  // ── Downloads ─────────────────────────────────────────────────────────────
  const handleDownloadCertificate = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('generate-loan-pdf', {
        body: { application_id: applicationId },
      });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `LoanPilot-Approval-${applicationId}.json` }).click();
    } catch { alert('Failed to generate certificate'); }
  };

  const handleGDPRExport = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('export-user-data', { body: { user_id: user?.id } });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: 'GDPR-Export.json' }).click();
    } catch { alert('Export failed'); }
  };

  const isApproved = pipeline.output.final_decision === 'APPROVED' || decisionData?.status === 'APPROVED';
  const riskScore = decisionData?.score ?? 0;

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
      <OfflineFallback />

      {/* ── LEFT COLUMN: Steps + Pipeline Panel ─────────────────────────── */}
      <div className="w-full lg:w-1/3 lg:sticky lg:top-28 space-y-8">
        {/* Branding */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-gold-dark/20 text-gold-dark text-xs font-bold uppercase tracking-widest mb-4 shadow-gold">
            <Shield className="w-3 h-3" />
            Secure Onboarding
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-brand-black leading-tight">
            Verify your<br />identity
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AI-powered KYC with 13-step verification pipeline including liveness, emotion tracking, and credit scoring.
          </p>
        </div>

        {/* Step tracker */}
        <div className="relative space-y-6">
          <div className="absolute left-[22px] top-6 bottom-6 w-px bg-gold-dark/20 hidden lg:block" />
          <StepIndicator currentStep={step} targetStep="ID_UPLOAD" stepOrder={0} number={1} title="Document Validation" desc="Aadhaar / PAN via Gemini Vision" />
          <StepIndicator currentStep={step} targetStep="VIDEO_KYC" stepOrder={1} number={2} title="Live Face + Liveness" desc="detect_face.tflite + track_eye.task" />
          <StepIndicator currentStep={step} targetStep="INTERVIEW" stepOrder={2} number={3} title="AI Interview" desc="Gemini + Whisper + emotion tracking" />
          <StepIndicator currentStep={step} targetStep="RESULT" stepOrder={3} number={4} title="Loan Decision" desc="AI + Rules + Credit Score" />
        </div>

        {/* Pipeline Status Panel (collapsible) */}
        <AnimatePresence>
          {showPipeline && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <button
                onClick={() => setShowPipeline((v) => !v)}
                className="flex items-center gap-2 text-xs font-bold text-gold-dark mb-2 w-full justify-between"
              >
                <span>Pipeline Status</span>
                {showPipeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <PipelineStatusPanel
                output={pipeline.output}
                activeStep={pipeline.activeStep}
                stepOrder={pipeline.STEP_ORDER}
                compact
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!showPipeline && (pipeline.output.errors.length > 0 || pipeline.output.final_decision !== 'PENDING') && (
          <button
            onClick={() => setShowPipeline(true)}
            className="text-xs text-gold-dark underline underline-offset-2"
          >
            Show pipeline details
          </button>
        )}
      </div>

      {/* ── RIGHT COLUMN: Active Step Content ───────────────────────────── */}
      <main className="w-full lg:w-2/3 min-h-[600px] flex items-start justify-center pt-2">
        <AnimatePresence mode="wait">

          {/* STEP 1 — Document Validation */}
          {step === 'ID_UPLOAD' && (
            <motion.div key="id" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="w-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-brand-black mb-1">Identity Verification</h2>
                <p className="text-sm text-muted-foreground">
                  Select your document type and upload a clear image. Gemini Vision will validate authenticity before proceeding.
                </p>
              </div>
              <DocumentValidator
                onValidated={handleDocumentValidated}
                isValidating={isValidating}
                validationError={validationError}
                validationSuccess={validationSuccess}
              />
            </motion.div>
          )}

          {/* STEP 2 — Video KYC */}
          {step === 'VIDEO_KYC' && (
            <motion.div key="video" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="w-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-brand-black mb-1">Live Face Verification</h2>
                <p className="text-sm text-muted-foreground">
                  Face detection, liveness challenge, and geo-location capture. All processed on-device.
                </p>
              </div>
              <VideoSession applicationId={applicationId ?? ''} onComplete={handleVideoComplete} />
            </motion.div>
          )}

          {/* STEP 3 — AI Interview */}
          {step === 'INTERVIEW' && (
            <motion.div key="interview" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="w-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-brand-black mb-1">AI Interview</h2>
                <p className="text-sm text-muted-foreground">
                  Answer a few questions about your loan purpose. AI tracks emotion and confidence in real time.
                </p>
              </div>
              <InterviewRoom
                applicationId={applicationId!}
                sessionId={sessionId!}
                onComplete={handleInterviewComplete}
              />
            </motion.div>
          )}

          {/* STEP 4 — Result */}
          {step === 'RESULT' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full bg-white border-2 border-gold/40 p-10 rounded-3xl shadow-gold-lg relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 gradient-gold" />

              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-9 h-9 text-green-500" />
              </div>

              <h2 className="text-3xl font-bold text-center mb-2 text-brand-black">
                {isApproved ? 'Application Approved!' : 'Under Review'}
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-8 max-w-sm mx-auto">
                {isApproved
                  ? 'Your identity has been verified and loan offer is ready.'
                  : 'We need a little more time. We will notify you shortly.'}
              </p>

              {/* Score cards */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <ResultCard label="Risk Score" value={`${riskScore}/100`} />
                <ResultCard label="AI Confidence" value={riskScore > 70 ? 'High' : 'Medium'} />
                <ResultCard label="Pipeline" value={`${pipeline.STEP_ORDER.filter(s => pipeline.output.step_status[s].status === 'success').length}/${pipeline.STEP_ORDER.length} OK`} />
              </div>

              {/* Loan customizer */}
              <div className="bg-card border border-gold-dark/15 p-7 rounded-3xl mb-7">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gold-dark mb-5">Customize Your Offer</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-3 text-brand-black">
                      <span>Loan Amount</span>
                      <span className="font-bold">₹{customAmount.toLocaleString()}</span>
                    </div>
                    <input type="range" min="50000" max="500000" step="10000" value={customAmount}
                      onChange={(e) => setCustomAmount(Number(e.target.value))}
                      className="w-full h-1.5 bg-gold/20 rounded-full appearance-none cursor-pointer accent-gold" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-3 text-brand-black">
                      <span>Tenure</span>
                      <span className="font-bold">{customTenure} Months</span>
                    </div>
                    <input type="range" min="6" max="36" step="6" value={customTenure}
                      onChange={(e) => setCustomTenure(Number(e.target.value))}
                      className="w-full h-1.5 bg-gold/20 rounded-full appearance-none cursor-pointer accent-gold" />
                  </div>
                  <div className="pt-5 border-t border-gold-dark/15 flex justify-between items-center">
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase font-bold">Estimated EMI</span>
                      <span className="text-2xl font-extrabold text-gold-dark">
                        ₹{Math.round((customAmount * (1 + (0.12 * customTenure / 12))) / customTenure).toLocaleString()}
                      </span>
                    </div>
                    <button className="px-5 py-2.5 rounded-xl gradient-gold font-bold text-xs uppercase tracking-widest text-brand-black gold-glow">
                      Apply Now
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                <button onClick={handleDownloadCertificate}
                  className="px-6 py-3 rounded-2xl bg-muted border border-gold-dark/15 font-bold text-sm hover:bg-card transition-all text-brand-black">
                  Download Certificate
                </button>
                <button onClick={handleGDPRExport}
                  className="px-6 py-3 rounded-2xl bg-muted border border-gold-dark/15 font-bold text-sm hover:bg-card transition-all text-brand-black">
                  Privacy Export (GDPR)
                </button>
              </div>

              <button className="px-8 py-3.5 rounded-2xl gradient-gold font-bold text-brand-black flex items-center gap-2 mx-auto shadow-gold hover:shadow-gold-lg transition-all gold-glow text-sm">
                View Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const StepIndicator = ({
  currentStep, targetStep, stepOrder, number, title, desc,
}: {
  currentStep: Step; targetStep: Step; stepOrder: number;
  number: number; title: string; desc: string;
}) => {
  const currentIndex = STEPS.indexOf(currentStep);
  const isCompleted = currentIndex > stepOrder;
  const isActive = currentStep === targetStep;
  const isPending = currentIndex < stepOrder;

  return (
    <div className={`relative z-10 flex items-start gap-4 transition-all duration-500 ${isPending ? 'opacity-40' : ''}`}>
      <div className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center font-bold border-2 transition-all duration-300
        ${isCompleted ? 'bg-green-50 text-green-600 border-green-200'
        : isActive ? 'gradient-gold text-brand-black border-gold shadow-gold'
        : 'bg-white text-muted-foreground border-gold-dark/20'}`}
      >
        {isCompleted
          ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          : number}
      </div>
      <div className="pt-1.5">
        <h3 className={`font-bold text-sm mb-0.5 ${isActive ? 'text-brand-black' : 'text-brand-black/70'}`}>{title}</h3>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
};

const ResultCard = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 rounded-2xl bg-card border border-gold-dark/15 text-center">
    <span className="block text-[9px] text-muted-foreground uppercase font-bold mb-1">{label}</span>
    <span className="text-sm font-bold text-brand-black">{value}</span>
  </div>
);

const CheckCircle = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
