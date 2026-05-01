'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Send, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase';

interface Message {
  role: 'AI' | 'USER';
  content: string;
}

export const InterviewRoom: React.FC<{ applicationId: string; sessionId: string; onComplete: () => void }> = ({ applicationId, sessionId, onComplete }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'AI', content: "Hello! I'm your AI Loan Assistant. Before we proceed, do you consent to this interview being recorded for loan processing?" }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [hasConsent, setHasConsent] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Whisper Worker
    workerRef.current = new Worker(new URL('/whisper-worker.js', window.location.href), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      if (e.data.status === 'complete') {
        const transcript = e.data.data.text;
        handleTranscriptResult(transcript);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    startCamera();
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Request Geolocation once camera is active
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          const supabase = createClient();
          await supabase.from('onboarding_sessions').update({
            geo_location: { lat: latitude, lng: longitude }
          }).eq('id', sessionId);
          console.log("Location updated", latitude, longitude);
        });
      }
    } catch (err) {
      console.error("Camera error", err);
    }
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSpeechInput = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setIsProcessing(true);
      return;
    }

    try {
      const stream = videoRef.current?.srcObject as MediaStream;
      if (!stream) return;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // If this is consent, upload it
        if (messages.length === 1 && !hasConsent) {
          uploadConsentAudio(audioBlob);
        }

        // Send to Whisper Worker
        const audioData = await audioBlob.arrayBuffer();
        const float32Data = new Float32Array(audioData); // Simplified conversion
        workerRef.current?.postMessage({ audio: float32Data, language });
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error", err);
    }
  };

  const uploadConsentAudio = async (blob: Blob) => {
    const supabase = createClient();
    const fileName = `consent-${applicationId}-${Date.now()}.wav`;
    const { data, error } = await supabase.storage
      .from('audit-vault')
      .upload(`${applicationId}/${fileName}`, blob);
    
    if (!error) {
      await supabase.from('audit_logs').insert({
        application_id: applicationId,
        event_type: 'CONSENT_AUDIO',
        event_data: { file_path: data.path }
      });
    }
  };

  const handleTranscriptResult = async (transcript: string) => {
    setMessages(prev => [...prev, { role: 'USER', content: transcript }]);
    setIsProcessing(true);

      // Simple Language Detection
      if (/[\u0900-\u097F]/.test(transcript)) {
        setLanguage('hi');
      }

      // If first message and no consent yet, this is the consent response
      if (messages.length === 1 && !hasConsent) {
        setHasConsent(true);
        // Log to audit vault
        const supabase = createClient();
        await supabase.from('audit_logs').insert({
          application_id: applicationId,
          event_type: 'VERBAL_CONSENT',
          event_data: { transcript, language }
        });
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke('interview-gemini', {
          body: { transcript, applicationId, history: messages }
        });
        
        if (error) throw error;
        
        const aiResponse = data.reply;
        setMessages(prev => [...prev, { role: 'AI', content: aiResponse }]);
        speak(aiResponse);
      } catch (err) {
        const fallback = language === 'hi' ? "मैं समझता हूँ। क्या आप मुझे अपने रोजगार के बारे में और बता सकते हैं?" : "I see. Could you tell me more about your employment?";
        setMessages(prev => [...prev, { role: 'AI', content: fallback }]);
        speak(fallback);
      } finally {
        setIsProcessing(false);
      }
    };

  const renderMessages = () => {
    return messages.map((msg, i) => {
      const isAI = msg.role === 'AI';
      const alignment = isAI ? 'justify-start' : 'justify-end';
      const bubble = isAI 
        ? 'bg-secondary text-secondary-foreground rounded-tl-none' 
        : 'gradient-primary text-white rounded-tr-none shadow-md';
      
      return (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`flex ${alignment}`}
        >
          <div className={`max-w-[80%] p-4 rounded-2xl flex gap-3 ${bubble}`}>
            {isAI && <Bot className="w-5 h-5 mt-1 shrink-0 opacity-50" />}
            <p className="text-sm leading-relaxed">{msg.content}</p>
            {!isAI && <User className="w-5 h-5 mt-1 shrink-0 opacity-50" />}
          </div>
        </motion.div>
      );
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row h-[700px] bg-glass border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
      <div className="w-full md:w-1/2 relative bg-black border-r border-white/10">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
        <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
          <div className="flex justify-between items-start">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white">Live AI Session</span>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-32 h-32 border-2 border-white/20 border-dashed rounded-full flex items-center justify-center">
              <div className="w-24 h-24 border border-primary/40 rounded-full animate-ping" />
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/60 uppercase font-bold tracking-tighter">AI Analysis</span>
              <span className="text-[10px] text-green-500 font-bold uppercase tracking-tighter">Stable</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary w-2/3 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white/5">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <Bot className="text-white w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{language === 'hi' ? 'ऋण अधिकारी AI' : 'Loan Officer AI'}</h3>
            <span className="text-[10px] text-primary uppercase font-bold tracking-widest">{language === 'hi' ? 'सक्रिय साक्षात्कार' : 'Active Interview'}</span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <AnimatePresence>
            {renderMessages()}
            {isProcessing && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-secondary p-4 rounded-2xl rounded-tl-none flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/10">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleSpeechInput}
              disabled={isProcessing}
              className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 hover:bg-white/20 text-foreground'
              }`}
            >
              {isRecording ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              {isRecording ? (language === 'hi' ? 'सुन रहा हूँ...' : 'Listening...') : (language === 'hi' ? 'बोलने के लिए दबाएं' : 'Press to Speak')}
            </button>
            <button 
              className="p-4 rounded-2xl bg-primary text-white hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
              disabled={isProcessing || isRecording}
              onClick={() => { if (messages.length > 5) onComplete(); }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-center mt-4 text-muted-foreground uppercase tracking-widest font-medium">
            Powered by Gemini AI & Whisper STT
          </p>
        </div>
      </div>
    </div>
  );
};
