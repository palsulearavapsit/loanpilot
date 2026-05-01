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
    <div className="w-full max-w-md mx-auto p-6 rounded-2xl bg-glass border border-white/10 shadow-2xl">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Identity Verification</h2>
        <p className="text-muted-foreground text-sm">
          Please upload a clear photo or PDF of your Aadhaar, PAN, or Voter ID.
        </p>
      </div>

      <div 
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative aspect-[1.6/1] rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center
          ${preview ? 'border-primary/50' : 'border-white/10 hover:border-primary/30'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <AnimatePresence mode="wait">
          {preview ? (
            preview === 'PDF_FILE' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
                <FileText className="w-16 h-16 text-primary" />
                <span className="text-xs font-bold">PDF Document Selected</span>
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
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <span className="text-sm font-semibold">Analyzing ID...</span>
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
