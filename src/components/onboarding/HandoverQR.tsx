'use client';

import React from 'react';
import { Smartphone, QrCode, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const HandoverQR: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const handoverUrl = `${window.location.origin}/onboarding?session=${sessionId}&mode=mobile`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(handoverUrl)}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-glass border border-white/10 p-8 rounded-[2.5rem] text-center max-w-md mx-auto"
    >
      <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Smartphone className="w-8 h-8 text-primary" />
      </div>
      
      <h3 className="text-2xl font-bold mb-2">Switch to Mobile?</h3>
      <p className="text-muted-foreground text-sm mb-8">
        For a better video interview experience, scan this code to continue on your smartphone.
      </p>

      <div className="bg-white p-4 rounded-3xl inline-block mb-8 shadow-2xl">
        <img src={qrUrl} alt="Handover QR Code" className="w-48 h-48" />
      </div>

      <div className="space-y-4">
        <button 
          onClick={() => window.open(handoverUrl, '_blank')}
          className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition-all flex items-center justify-center gap-2"
        >
          Open in New Tab <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
          OR CONTINUE ON THIS DEVICE BELOW
        </p>
      </div>
    </motion.div>
  );
};
