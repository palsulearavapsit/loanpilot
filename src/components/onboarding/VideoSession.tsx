'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Camera, ShieldCheck, Activity, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

interface VideoSessionProps {
  onComplete: (sessionData: any) => void;
  applicationId: string;
}

export const VideoSession: React.FC<VideoSessionProps> = ({ onComplete, applicationId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [livenessStatus, setLivenessStatus] = useState<'IDLE' | 'TRACKING' | 'SUCCESS'>('IDLE');
  const [emotion, setEmotion] = useState<string>('Analyzing...');

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: true 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setLivenessStatus('TRACKING');
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  // Mock Liveness & Emotion Analysis loop
  useEffect(() => {
    if (livenessStatus === 'TRACKING') {
      const ctx = canvasRef.current?.getContext('2d');
      let frame = 0;
      
      const drawMesh = () => {
        if (!ctx || !canvasRef.current) return;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Draw simulated face mesh points with gold color
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
        ctx.lineWidth = 0.5;
        
        const centerX = canvasRef.current.width / 2;
        const centerY = canvasRef.current.height / 2;
        const radius = 80 + Math.sin(frame * 0.1) * 2;

        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          for (let j = 0; j < 20; j++) {
            const angle2 = (j / 20) * Math.PI * 2;
            const x2 = centerX + Math.cos(angle2) * (radius * 0.8);
            const y2 = centerY + Math.sin(angle2) * (radius * 0.8);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
        
        frame++;
        if (livenessStatus === 'TRACKING') requestAnimationFrame(drawMesh);
      };
      
      drawMesh();

      const interval = setInterval(() => {
        const emotions = ['Confident', 'Neutral', 'Focused', 'Calm'];
        setEmotion(emotions[Math.floor(Math.random() * emotions.length)]);
      }, 2000);

      const timer = setTimeout(() => {
        handleCaptureConsent();
      }, 6000);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [livenessStatus]);

  const handleCaptureConsent = () => {
    setLivenessStatus('SUCCESS');
    
    const estimatedAge = Math.floor(Math.random() * (45 - 25) + 25);
    const stabilityScore = 0.95 + (Math.random() * 0.05);

    onComplete({
      timestamp: new Date().toISOString(),
      emotion_avg: 'Confident',
      liveness_score: 0.98,
      estimated_age: estimatedAge,
      stability_score: stabilityScore,
      consent_recorded: true
    });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-full max-w-2xl aspect-video rounded-3xl overflow-hidden bg-black border-2 border-gold/40 shadow-gold-lg">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-cover mirror"
        />
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={480} 
          className="absolute inset-0 w-full h-full object-cover mirror pointer-events-none"
        />
        
        {/* HUD Overlay */}
        <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">Live Session</span>
            </div>
            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-gold/30">
              <Brain className="w-4 h-4 text-gold-light" />
              <span className="text-xs font-bold text-gold-light">{emotion}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="w-64 h-64 border-2 border-white/20 border-dashed rounded-full flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-gold/40 rounded-full animate-pulse" />
            </div>
            <p className="text-sm font-medium bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg text-white">
              Position your face within the circle
            </p>
          </div>

          <div className="flex justify-between items-end">
            <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl flex items-center gap-3 border border-white/10">
              <Activity className="w-5 h-5 text-gold-light" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/60 uppercase">Stability</span>
                <span className="text-xs font-bold text-white">Optimal</span>
              </div>
            </div>
            <ShieldCheck className="w-8 h-8 text-green-500 drop-shadow-lg" />
          </div>
        </div>
      </div>

      <div className="w-full max-w-md bg-white border-2 border-gold/40 p-6 rounded-2xl shadow-gold">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-brand-black">
          <Camera className="w-5 h-5 text-gold" />
          Onboarding Progress
        </h3>
        <div className="space-y-4">
          <Step label="Face Detection" status="completed" />
          <Step label="Liveness Challenge" status="active" />
          <Step label="AI Interview" status="pending" />
        </div>

        <button 
          onClick={handleCaptureConsent}
          className="w-full mt-6 py-4 rounded-xl gradient-gold font-bold text-brand-black shadow-gold hover:shadow-gold-lg hover:scale-[1.02] active:scale-[0.98] transition-all gold-glow"
        >
          Confirm Presence & Start Interview
        </button>
      </div>
    </div>
  );
};

const Step = ({ label, status }: { label: string, status: 'completed' | 'active' | 'pending' }) => (
  <div className="flex items-center justify-between">
    <span className={`text-sm ${status === 'pending' ? 'text-muted-foreground' : 'font-medium text-brand-black'}`}>{label}</span>
    {status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
    {status === 'active' && <div className="w-4 h-4 rounded-full border-2 border-gold border-t-transparent animate-spin" />}
    {status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-gold/20" />}
  </div>
);

const CheckCircle = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
