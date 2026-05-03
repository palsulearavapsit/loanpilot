'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Clock, AlertTriangle, SkipForward, RefreshCw, RotateCcw } from 'lucide-react';
import type { PipelineStepName, StepResult, PipelineOutput } from '@/lib/hooks/useKYCPipeline';

const STEP_LABELS: Record<PipelineStepName, string> = {
  DOC_VALIDATION:       'Document Validation (Gemini)',
  ID_UPLOAD_OCR:        'ID Upload + OCR',
  FACE_EXTRACT:         'Face Extraction (detect_face.tflite)',
  AGE_VALIDATION:       'Age Validation',
  DELETE_ID:            'Delete ID (Privacy)',
  STORE_FACE_EMBEDDING: 'Store Face Embedding',
  VIDEO_GEOLOCATION:    'Video + Geo-location',
  LIVE_FACE_VERIFY:     'Live Face Verify (detect_face.tflite)',
  LIVENESS_EYE:         'Liveness Check (track_eye.task)',
  AI_INTERVIEW_CONSENT: 'AI Interview + Consent',
  EMOTION_TRACKING:     'Emotion Tracking (detect_emotion.h5)',
  CREDIT_DECISION:      'AI + Rules + Credit Score',
  STORE_LOGS:           'Store Audit Logs',
  LOAN_DECISION:        'Loan Decision',
};

interface PipelineStatusPanelProps {
  output: PipelineOutput;
  activeStep: PipelineStepName | null;
  stepOrder: PipelineStepName[];
  compact?: boolean;
  onRetryStep?: (step: PipelineStepName) => void;
  onStartOver?: () => void;
}

export const PipelineStatusPanel: React.FC<PipelineStatusPanelProps> = ({
  output,
  activeStep,
  stepOrder,
  compact = false,
  onRetryStep,
  onStartOver,
}) => {
  const allSteps = stepOrder.map((s) => output.step_status[s]);
  const totalSteps = allSteps.length;
  const doneSteps = allSteps.filter((s) => s.status === 'success' || s.status === 'skipped').length;
  const failedSteps = allSteps.filter((s) => s.status === 'failed').length;
  const progress = Math.round((doneSteps / totalSteps) * 100);

  return (
    <div className="w-full bg-white border-2 border-gold/30 rounded-2xl overflow-hidden shadow-gold">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gold-dark/10 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-brand-black">KYC Pipeline</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {doneSteps}/{totalSteps} steps complete
            {failedSteps > 0 && <span className="ml-2 text-red-500">{failedSteps} failed</span>}
          </p>
        </div>
        <DecisionBadge decision={output.final_decision} />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gold/10">
        <motion.div
          className="h-full gradient-gold"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Steps */}
      <div className={`${compact ? 'max-h-64 overflow-y-auto' : ''} divide-y divide-gold-dark/5`}>
        {stepOrder.map((stepName, idx) => {
          const step = output.step_status[stepName];
          const isActive = activeStep === stepName;
          return (
            <StepRow
              key={stepName}
              stepName={stepName}
              label={STEP_LABELS[stepName]}
              step={step}
              isActive={isActive}
              index={idx + 1}
              onRetry={onRetryStep ? () => onRetryStep(stepName) : undefined}
            />
          );
        })}
      </div>

      {/* Errors */}
      <AnimatePresence>
        {output.errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-red-100 bg-red-50/60 px-5 py-3"
          >
            <p className="text-xs font-bold text-red-600 mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Auto-fix Log
            </p>
            <ul className="space-y-1">
              {output.errors.map((err, i) => (
                <li key={i} className="text-[11px] text-red-500 font-mono leading-tight">{err}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action footer: shown when any step failed */}
      <AnimatePresence>
        {failedSteps > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gold/20 bg-amber-50/40 px-5 py-3 flex flex-col gap-2"
          >
            <p className="text-[11px] text-amber-700 font-semibold">
              {failedSteps} step{failedSteps > 1 ? 's' : ''} failed. Retry the failed step or start over.
            </p>
            <div className="flex gap-2">
              {onStartOver && (
                <button
                  onClick={onStartOver}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-[11px] font-bold hover:bg-red-50 transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  Start from First
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StepRow = ({
  stepName, label, step, isActive, index, onRetry,
}: {
  stepName: PipelineStepName;
  label: string;
  step: StepResult;
  isActive: boolean;
  index: number;
  onRetry?: () => void;
}) => {
  const statusIcon = {
    pending:  <Clock className="w-4 h-4 text-muted-foreground/50" />,
    running:  <Loader2 className="w-4 h-4 text-gold animate-spin" />,
    retrying: <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />,
    success:  <CheckCircle className="w-4 h-4 text-green-500" />,
    failed:   <XCircle className="w-4 h-4 text-red-500" />,
    skipped:  <SkipForward className="w-4 h-4 text-muted-foreground" />,
  }[step.status];

  const rowBg = isActive
    ? 'bg-gold/5'
    : step.status === 'failed'
    ? 'bg-red-50/40'
    : step.status === 'success'
    ? 'bg-green-50/20'
    : '';

  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 transition-colors ${rowBg}`}>
      <span className="text-[10px] font-bold text-muted-foreground/50 w-4 text-right shrink-0">
        {index}
      </span>
      <div className="shrink-0">{statusIcon}</div>
      <div className="flex-1 min-w-0">
        <span className={`text-xs truncate block ${step.status === 'pending' ? 'text-muted-foreground/60' : 'text-brand-black font-medium'}`}>
          {label}
        </span>
        {step.status === 'retrying' && (
          <span className="text-[10px] text-amber-600">Retrying... attempt {step.retries}</span>
        )}
        {step.status === 'failed' && step.error && (
          <span className="text-[10px] text-red-500 truncate block">{step.error}</span>
        )}
        {step.status === 'skipped' && step.error && (
          <span className="text-[10px] text-muted-foreground truncate block">{step.error}</span>
        )}
      </div>
      {/* Retry button — shown only on failed steps */}
      {step.status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          title="Retry this step"
          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-red-200 text-red-500 text-[10px] font-bold hover:bg-red-50 hover:border-red-400 transition-all"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
      {step.status === 'success' && step.retries > 0 && (
        <span className="text-[9px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
          {step.retries}x retry
        </span>
      )}
    </div>
  );
};

const DecisionBadge = ({ decision }: { decision: PipelineOutput['final_decision'] }) => {
  const config = {
    PENDING:      { label: 'Pending',      cls: 'bg-gray-100 text-gray-500' },
    APPROVED:     { label: 'Approved',     cls: 'bg-green-100 text-green-700' },
    REJECTED:     { label: 'Rejected',     cls: 'bg-red-100 text-red-700' },
    UNDER_REVIEW: { label: 'Under Review', cls: 'bg-amber-100 text-amber-700' },
  }[decision];

  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${config.cls}`}>
      {config.label}
    </span>
  );
};
