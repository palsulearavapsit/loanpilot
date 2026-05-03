'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IDUpload } from '@/components/onboarding/IDUpload';
import { VideoSession } from '@/components/onboarding/VideoSession';
import { InterviewRoom } from '@/components/onboarding/InterviewRoom';
import { CheckCircle, Shield, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { createClient } from '@/lib/supabase';
import { useHeartbeat } from '@/lib/hooks/useHeartbeat';
import { OfflineFallback } from '@/components/onboarding/OfflineFallback';

type Step = 'ID_UPLOAD' | 'VIDEO_KYC' | 'INTERVIEW' | 'RESULT';

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('ID_UPLOAD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [decisionData, setDecisionData] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState(100000);
  const [customTenure, setCustomTenure] = useState(12);

  // Sync session state to Supabase
  useHeartbeat(sessionId, step, { applicationId });

  React.useEffect(() => {
    const savedId = localStorage.getItem('kyc_done');
    if (savedId) {
      setApplicationId(savedId);
      setStep('VIDEO_KYC');
      initializeSession(savedId);
    }
  }, []);

  const initializeSession = async (appId: string) => {
    const supabase = createClient();
    const { data: session, error } = await supabase
      .from('onboarding_sessions')
      .insert({ application_id: appId })
      .select()
      .single();
    
    if (!error && session) {
      setSessionId(session.id);
    }
  };

  const handleIDUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const supabase = createClient();
      const fileName = `${Date.now()}-${file.name}`;
      
      // 1. Upload to Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('temp-kyc')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      // 2. Call Edge Function for KYC
      const { data: kycResult, error: kycError } = await supabase.functions.invoke('process-id-kyc', {
        body: { image_url: uploadData.path, user_id: (await supabase.auth.getUser()).data.user?.id }
      });
      if (kycError) throw kycError;

      setApplicationId(kycResult.application_id);
      localStorage.setItem('kyc_done', kycResult.application_id);
      await initializeSession(kycResult.application_id);
      setStep('VIDEO_KYC');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideoComplete = async (data: any) => {
    try {
      const supabase = createClient();
      // Record verification log
      await supabase.from('verification_logs').insert({
        application_id: applicationId,
        event_type: 'VIDEO_KYC',
        status: 'SUCCESS',
        payload: data
      });
      setStep('INTERVIEW');
    } catch (err) {
      setStep('INTERVIEW'); // Fallback
    }
  };

  const handleInterviewComplete = async () => {
    setIsProcessing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('calculate-loan-decision', {
        body: { application_id: applicationId }
      });
      
      if (!error && data) {
        setDecisionData(data);
        setStep('RESULT');
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#EFC86E', '#D4AF37', '#D39B2A']
        });
      }
    } catch (err) {
      console.error("Decision error", err);
      setStep('RESULT'); // Fallback
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCertificate = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('generate-loan-pdf', {
        body: { application_id: applicationId }
      });
      if (error) throw error;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LoanPilot-Approval-${applicationId}.json`;
      a.click();
    } catch (err) {
      alert("Failed to generate certificate");
    }
  };

  const handleGDPRStore = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: { user_id: (await supabase.auth.getUser()).data.user?.id }
      });
      if (error) throw error;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GDPR-Export.json`;
      a.click();
    } catch (err) {
      alert("Export failed");
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">
      <OfflineFallback />
      
      {/* Left Column: Progress & Info */}
      <div className="w-full lg:w-1/3 lg:sticky lg:top-32 border-b lg:border-b-0 border-gold-dark/10 pb-8 lg:pb-0">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-gold-dark/20 text-gold-dark text-xs font-bold uppercase tracking-widest mb-4 shadow-gold">
            <Shield className="w-3 h-3" />
            Secure Onboarding
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-brand-black leading-tight">
            Verify your <br/> identity
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Follow these professional steps to securely verify your identity and get your loan approved instantly through our Agentic AI system.
          </p>
        </div>
        
        {/* Vertical Progress Tracker */}
        <div className="space-y-8 mt-12 relative">
          {/* Vertical connecting line */}
          <div className="absolute left-6 top-6 bottom-6 w-px bg-gold-dark/20 z-0 hidden lg:block" />

          <StepIndicator currentStep={step} targetStep="ID_UPLOAD" stepOrder={0} number={1} title="Document Upload" desc="Aadhaar, PAN, or Voter ID" />
          <StepIndicator currentStep={step} targetStep="VIDEO_KYC" stepOrder={1} number={2} title="Live Face Match" desc="Real-time liveness check" />
          <StepIndicator currentStep={step} targetStep="INTERVIEW" stepOrder={2} number={3} title="AI Interview" desc="Loan purpose validation" />
          <StepIndicator currentStep={step} targetStep="RESULT" stepOrder={3} number={4} title="Instant Decision" desc="Get your approved offer" />
        </div>
      </div>

      {/* Right Column: Interactive Content */}
      <main className="w-full lg:w-2/3 relative min-h-[600px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {step === 'ID_UPLOAD' && (
            <motion.div 
              key="id" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
            >
              <IDUpload onUpload={handleIDUpload} isProcessing={isProcessing} />
            </motion.div>
          )}

          {step === 'VIDEO_KYC' && (
            <motion.div 
              key="video" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
            >
              <VideoSession applicationId={applicationId!} onComplete={handleVideoComplete} />
            </motion.div>
          )}

          {step === 'INTERVIEW' && (
            <motion.div 
              key="interview" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
            >
              <InterviewRoom applicationId={applicationId!} sessionId={sessionId!} onComplete={handleInterviewComplete} />
            </motion.div>
          )}

          {step === 'RESULT' && (
            <motion.div 
              key="result" 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="text-center bg-white border-2 border-gold/40 p-12 rounded-3xl shadow-gold-lg relative overflow-hidden"
            >
              {/* Gold top accent */}
              <div className="absolute top-0 left-0 right-0 h-1 gradient-gold" />

              <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-brand-black">
                {decisionData?.status === 'APPROVED' ? 'Application Approved!' : 'Application Under Review'}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {decisionData?.status === 'APPROVED' 
                  ? `Based on our AI analysis and credit scoring, you have been approved for a loan of up to ₹${(applicationId ? '5,00,000' : '0')}.`
                  : 'We need a little more time to review your application. We will get back to you shortly.'}
              </p>
              
              <div className="grid grid-cols-3 gap-4 mb-8">
                <ResultCard label="Risk Score" value={`${decisionData?.score || 0}/100`} />
                <ResultCard label="AI Confidence" value={decisionData?.score > 70 ? 'High' : 'Medium'} />
                <ResultCard label="Bureau Score" value={decisionData?.bureau_score || '720+'} />
              </div>

                <div className="bg-card border border-gold-dark/15 p-8 rounded-3xl mb-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gold-dark mb-6">Customize Your Offer</h3>
                  
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between text-sm mb-4 text-brand-black">
                        <span>Loan Amount</span>
                        <span className="font-bold">₹{customAmount.toLocaleString()}</span>
                      </div>
                      <input 
                        type="range" min="50000" max="500000" step="10000"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(Number(e.target.value))}
                        className="w-full h-1.5 bg-gold/20 rounded-full appearance-none cursor-pointer accent-gold"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-4 text-brand-black">
                        <span>Tenure (Months)</span>
                        <span className="font-bold">{customTenure} Months</span>
                      </div>
                      <input 
                        type="range" min="6" max="36" step="6"
                        value={customTenure}
                        onChange={(e) => setCustomTenure(Number(e.target.value))}
                        className="w-full h-1.5 bg-gold/20 rounded-full appearance-none cursor-pointer accent-gold"
                      />
                    </div>

                    <div className="pt-6 border-t border-gold-dark/15 flex justify-between items-center">
                      <div className="text-left">
                        <span className="block text-[10px] text-muted-foreground uppercase font-bold">Estimated EMI</span>
                        <span className="text-2xl font-extrabold gradient-gold-text">₹{Math.round((customAmount * (1 + (0.12 * customTenure / 12))) / customTenure).toLocaleString()}</span>
                      </div>
                      <button className="px-6 py-3 rounded-xl gradient-gold font-bold text-xs uppercase tracking-widest text-brand-black gold-glow transition-all">
                        Apply Now
                      </button>
                    </div>
                  </div>
                </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={handleDownloadCertificate}
                  className="px-8 py-4 rounded-2xl bg-muted border border-gold-dark/15 font-bold hover:bg-card transition-all flex items-center gap-2 justify-center text-brand-black"
                >
                  Download Certificate
                </button>
                <button 
                  onClick={handleGDPRStore}
                  className="px-8 py-4 rounded-2xl bg-muted border border-gold-dark/15 font-bold hover:bg-card transition-all flex items-center gap-2 justify-center text-brand-black"
                >
                  Privacy Data Export
                </button>
              </div>

              <button className="px-8 py-4 rounded-2xl gradient-gold font-bold text-brand-black flex items-center gap-3 mx-auto mt-8 shadow-gold hover:shadow-gold-lg transition-all gold-glow">
                View Dashboard <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

const STEPS = ['ID_UPLOAD', 'VIDEO_KYC', 'INTERVIEW', 'RESULT'];

const StepIndicator = ({ currentStep, targetStep, stepOrder, number, title, desc }: { currentStep: string, targetStep: string, stepOrder: number, number: number, title: string, desc: string }) => {
  const currentIndex = STEPS.indexOf(currentStep);
  const isCompleted = currentIndex > stepOrder;
  const isActive = currentStep === targetStep;
  const isPending = currentIndex < stepOrder;

  return (
    <div className={`relative z-10 flex items-start gap-6 transition-all duration-500 ${isPending ? 'opacity-50 grayscale' : 'opacity-100'}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border-2 shadow-sm transition-all duration-300
        ${isCompleted ? 'bg-green-50 text-green-600 border-green-200' : isActive ? 'gradient-gold text-brand-black border-gold shadow-gold' : 'bg-white text-muted-foreground border-gold-dark/20'}
      `}>
        {isCompleted ? <CheckCircle className="w-6 h-6" /> : number}
      </div>
      <div className="pt-2">
        <h3 className={`font-bold text-lg mb-1 ${isActive ? 'text-brand-black' : 'text-brand-black/70'}`}>{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
};

const ResultCard = ({ label, value }: { label: string, value: string }) => (
  <div className="p-4 rounded-2xl bg-card border border-gold-dark/15">
    <span className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">{label}</span>
    <span className="text-lg font-bold text-brand-black">{value}</span>
  </div>
);
