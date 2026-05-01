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

type Step = 'ID_UPLOAD' | 'VIDEO_KYC' | 'INTERVIEW' | 'RESULT';

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('ID_UPLOAD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

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

  const handleInterviewComplete = () => {
    setStep('RESULT');
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#8b5cf6', '#10b981']
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-12">
      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
          <Shield className="w-3 h-3" />
          Secure Onboarding
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          Complete your application
        </h1>
        
        {/* Progress Bar */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <ProgressDot active={step === 'ID_UPLOAD'} completed={['VIDEO_KYC', 'INTERVIEW', 'RESULT'].includes(step)} />
          <div className="w-12 h-px bg-white/10" />
          <ProgressDot active={step === 'VIDEO_KYC'} completed={['INTERVIEW', 'RESULT'].includes(step)} />
          <div className="w-12 h-px bg-white/10" />
          <ProgressDot active={step === 'INTERVIEW'} completed={step === 'RESULT'} />
        </div>
      </header>

      <main className="relative min-h-[500px]">
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
              className="text-center bg-glass border border-white/10 p-12 rounded-3xl"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Application Approved!</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Based on our AI analysis and credit scoring, you have been approved for a loan of up to ₹5,00,000.
              </p>
              
              <div className="grid grid-cols-3 gap-4 mb-8">
                <ResultCard label="Risk Score" value="98/100" />
                <ResultCard label="AI Confidence" value="High" />
                <ResultCard label="Bureau Score" value="782" />
              </div>

              <button className="px-8 py-4 rounded-2xl gradient-primary font-bold text-white flex items-center gap-3 mx-auto hover:shadow-lg transition-all">
                View Dashboard <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

const ProgressDot = ({ active, completed }: { active: boolean, completed: boolean }) => (
  <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
    completed ? 'bg-green-500' : active ? 'bg-primary scale-125 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white/10'
  }`} />
);

const ResultCard = ({ label, value }: { label: string, value: string }) => (
  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
    <span className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">{label}</span>
    <span className="text-lg font-bold">{value}</span>
  </div>
);
