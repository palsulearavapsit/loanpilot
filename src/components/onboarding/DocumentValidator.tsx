'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, Loader2, FileText, CreditCard, Shield } from 'lucide-react';

export type DocType = 'AADHAAR' | 'PAN';

interface DocumentValidatorProps {
  onValidated: (file: File, docType: DocType) => void;
  isValidating: boolean;
  validationError?: string;
  validationSuccess?: boolean;
}

export const DocumentValidator: React.FC<DocumentValidatorProps> = ({
  onValidated,
  isValidating,
  validationError,
  validationSuccess,
}) => {
  const [docType, setDocType] = useState<DocType>('AADHAAR');
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = () => {
    if (selectedFile && !isValidating) {
      onValidated(selectedFile, docType);
    }
  };

  const docTypeConfig = {
    AADHAAR: {
      label: 'Aadhaar Card',
      icon: Shield,
      rules: ['12-digit number (XXXX XXXX XXXX)', '"Government of India" text visible'],
      color: 'border-blue-400/60 bg-blue-50/40',
      activeColor: 'border-gold bg-gold/10',
    },
    PAN: {
      label: 'PAN Card',
      icon: CreditCard,
      rules: ['Format: ABCDE1234F (10 chars)', '"Income Tax Department" text visible'],
      color: 'border-purple-400/60 bg-purple-50/40',
      activeColor: 'border-gold bg-gold/10',
    },
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      {/* Step 1: Document Type */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Step 1 — Select Document Type
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(['AADHAAR', 'PAN'] as DocType[]).map((type) => {
            const cfg = docTypeConfig[type];
            const Icon = cfg.icon;
            const isActive = docType === type;
            return (
              <button
                key={type}
                onClick={() => { setDocType(type); setPreview(null); setSelectedFile(null); setFileName(null); }}
                className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                  isActive ? cfg.activeColor + ' shadow-gold' : 'border-gold-dark/20 bg-white hover:border-gold/40'
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${isActive ? 'text-gold-dark' : 'text-muted-foreground'}`} />
                <span className={`block text-sm font-bold ${isActive ? 'text-brand-black' : 'text-muted-foreground'}`}>
                  {cfg.label}
                </span>
                <ul className="mt-2 space-y-0.5">
                  {cfg.rules.map((r) => (
                    <li key={r} className="text-[10px] text-muted-foreground leading-tight">{r}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Upload */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Step 2 — Upload {docTypeConfig[docType].label}
        </p>

        <div
          onClick={() => !isValidating && fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center min-h-[160px]
            ${preview ? 'border-gold/50' : 'border-gold-dark/20 hover:border-gold/40'}
            ${isValidating ? 'opacity-60 cursor-not-allowed' : ''}
          `}
        >
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.img
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={preview}
                className="w-full h-full object-contain max-h-48 p-2"
                alt="Document preview"
              />
            ) : fileName ? (
              <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 py-8">
                <FileText className="w-10 h-10 text-gold" />
                <span className="text-xs font-semibold text-brand-black">{fileName}</span>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 px-4">
                <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground block">
                  Click to upload {docTypeConfig[docType].label}
                </span>
                <span className="text-xs text-muted-foreground">PNG, JPG supported</span>
              </motion.div>
            )}
          </AnimatePresence>

          {isValidating && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <motion.div
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                className="absolute left-0 right-0 h-0.5 bg-gold shadow-[0_0_12px_rgba(212,175,55,0.9)]"
              />
              <Loader2 className="w-7 h-7 animate-spin text-gold mb-2" />
              <span className="text-xs font-bold text-brand-black">Validating with Gemini Vision</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                Checking {docTypeConfig[docType].label} authenticity...
              </span>
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png,image/jpeg,image/jpg"
        />
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{validationError}</span>
          </motion.div>
        )}

        {validationSuccess && !validationError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{docTypeConfig[docType].label} verified successfully. Proceeding to pipeline...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!selectedFile || isValidating}
        className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
          selectedFile && !isValidating
            ? 'gradient-gold text-brand-black shadow-gold hover:shadow-gold-lg hover:scale-[1.01] gold-glow'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        }`}
      >
        {isValidating ? 'Validating...' : `Validate & Start KYC`}
      </button>
    </div>
  );
};
