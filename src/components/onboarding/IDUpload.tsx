'use client';

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface IDUploadProps {
  onUpload: (file: File) => Promise<void>;
  isProcessing: boolean;
  error?: string;
}

export const IDUpload: React.FC<IDUploadProps> = ({ onUpload, isProcessing, error }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setPreview('PDF_FILE'); // Special marker for PDF
      } else {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
      onUpload(file);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-2xl bg-white border-2 border-gold/40 shadow-gold-lg relative overflow-hidden">
      {/* Gold top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 gradient-gold" />

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2 text-brand-black">Identity Verification</h2>
        <p className="text-muted-foreground text-sm">
          Please upload a clear photo or PDF of your Aadhaar, PAN, or Voter ID.
        </p>
      </div>

      <div 
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative aspect-[1.6/1] rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center
          ${preview ? 'border-gold/50' : 'border-gold-dark/20 hover:border-gold/40'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <AnimatePresence mode="wait">
          {preview ? (
            preview === 'PDF_FILE' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
                <FileText className="w-16 h-16 text-gold" />
                <span className="text-xs font-bold text-brand-black">PDF Document Selected</span>
              </motion.div>
            ) : (
              <motion.img 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={preview} 
                className="w-full h-full object-cover" 
                alt="ID Preview" 
              />
            )
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Click to upload or drag & drop</span>
            </motion.div>
          )}
        </AnimatePresence>

        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center overflow-hidden">
            {/* Live Scan Bar */}
            <motion.div 
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-gold shadow-[0_0_15px_rgba(212,175,55,0.8)] z-10"
            />
            
            {/* Bounding Box Simulation */}
            <div className="absolute inset-8 border-2 border-gold/40 rounded-lg pointer-events-none">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-gold" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-gold" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-gold" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-gold" />
            </div>

            <Loader2 className="w-8 h-8 animate-spin text-gold mb-2 relative z-20" />
            <span className="text-sm font-semibold text-brand-black relative z-20">Analyzing ID...</span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1 relative z-20">Extracting OCR Data</span>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf"
      />

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>High quality image (no blur)</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>All four corners visible</span>
        </div>
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-sm text-destructive"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
};
