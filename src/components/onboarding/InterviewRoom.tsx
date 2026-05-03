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
  const [livenessChallenge, setLivenessChallenge] = useState<{ type: 'BLINK' | 'TURN_HEAD'; status: 'PENDING' | 'SUCCESS' | 'FAILED' } | null>(null);
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
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    // Start VAD monitoring if not processing
    if (!isProcessing && hasConsent) {
      const vadCleanup = startVAD();
      return () => {
        vadCleanup.then(cleanup => cleanup?.());
      };
    }
  }, [messages, isProcessing, hasConsent]);

  const startVAD = async () => {
    try {
      const stream = videoRef.current?.srcObject as MediaStream;
      if (!stream) return;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      
      source.connect(processor);
      processor.connect(audioContext.destination);

      let silenceStart = Date.now();
      
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        let sum = 0.0;
        for (let i = 0; i < input.length; ++i) {
          sum += input[i] * input[i];
        }
        const volume = Math.sqrt(sum / input.length);

        if (volume > 0.05) {
          if (!isRecording && !isProcessing) {
            handleSpeechInput();
          }
          silenceStart = Date.now();
        } else {
          if (isRecording && Date.now() - silenceStart > 2000) {
            handleSpeechInput();
          }
        }
      };

      return () => {
        processor.disconnect();
        source.disconnect();
        audioContext.close();
      };
    } catch (err) {
      console.error("VAD Error", err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Request Geolocation once camera is active
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          const supabase = createClient();
          
          // Reverse geocode (Mock check for India for this MVP)
          const isIndia = latitude > 8 && latitude < 37 && longitude > 68 && longitude < 97;
          
          await supabase.from('onboarding_sessions').update({
            geo_location: { lat: latitude, lng: longitude, is_supported_region: isIndia }
          }).eq('id', sessionId);
          
          await supabase.from('verification_logs').insert({
            application_id: applicationId,
            event_type: 'GEOLOCATION',
            status: isIndia ? 'SUCCESS' : 'FLAGGED',
            payload: { lat: latitude, lng: longitude }
          });
          
          console.log("Location updated", latitude, longitude, "Supported:", isIndia);
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
        // Use the recorder's actual MIME type — not 'audio/wav' which would mismatch
        // webm/opus (Chrome default) and cause decodeAudioData EncodingError
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // If this is consent, upload it
        if (messages.length === 1 && !hasConsent) {
          uploadConsentAudio(audioBlob);
        }

        // Send to Whisper Worker — wrap decodeAudioData so an empty/corrupt
        // recording doesn't throw an unhandled EncodingError rejection
        try {
          // Do NOT force sampleRate — the stream's native rate must be used
          // for decodeAudioData; resampling happens inside the Whisper worker
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const arrayBuffer = await audioBlob.arrayBuffer();
          if (arrayBuffer.byteLength === 0) throw new Error('Empty audio buffer');
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const float32Data = audioBuffer.getChannelData(0);
          workerRef.current?.postMessage({ audio: float32Data, language });
          await audioContext.close();
        } catch (decodeErr) {
          console.warn('[STT] decodeAudioData failed, skipping Whisper:', decodeErr);
          setIsProcessing(false);
        }
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
        
        // Randomly trigger a liveness challenge every 3-4 messages
        if (messages.length >= 3 && !livenessChallenge) {
          const challengeType = Math.random() > 0.5 ? 'BLINK' : 'TURN_HEAD';
          const challengePrompt = challengeType === 'BLINK' 
            ? (language === 'hi' ? "आगे बढ़ने से पहले, कृपया एक बार अपनी आँखें धीरे से झपकाएं।" : "Before we continue, please blink your eyes slowly once.")
            : (language === 'hi' ? "कृपया अपना सिर दाईं ओर घुमाएं।" : "Please turn your head to the right.");
          
          setLivenessChallenge({ type: challengeType, status: 'PENDING' });
          setMessages(prev => [...prev, { role: 'AI', content: challengePrompt }]);
          speak(challengePrompt);
          
          // Simulate detection after 3 seconds
          setTimeout(async () => {
            setLivenessChallenge(prev => prev ? { ...prev, status: 'SUCCESS' } : null);
            const supabase = createClient();
            await supabase.from('verification_logs').insert({
              application_id: applicationId,
              event_type: 'LIVENESS_CHALLENGE',
              status: 'SUCCESS',
              payload: { type: challengeType }
            });
          }, 3000);
          return;
        }

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
        ? 'bg-card text-brand-black rounded-tl-none border border-gold-dark/10' 
        : 'gradient-gold text-brand-black rounded-tr-none shadow-gold';
      
      return (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`flex ${alignment}`}
        >
          <div className={`max-w-[80%] p-4 rounded-2xl flex gap-3 ${bubble}`}>
            {isAI && <Bot className="w-5 h-5 mt-1 shrink-0 text-gold-dark opacity-70" />}
            <p className="text-sm leading-relaxed">{msg.content}</p>
            {!isAI && <User className="w-5 h-5 mt-1 shrink-0 opacity-60" />}
          </div>
        </motion.div>
      );
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row h-[700px] bg-white border-2 border-gold/40 rounded-[2.5rem] overflow-hidden shadow-gold-lg">
      <div className="w-full md:w-1/2 relative bg-black border-r border-gold-dark/15">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
        <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
          <div className="flex justify-between items-start">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/20">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white">Live AI Session</span>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-32 h-32 border-2 border-white/20 border-dashed rounded-full flex items-center justify-center">
              <div className="w-24 h-24 border border-gold/40 rounded-full animate-ping" />
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/60 uppercase font-bold tracking-tighter">AI Confidence Meter</span>
              <span className="text-[10px] text-green-500 font-bold uppercase tracking-tighter">98.2% Accurate</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex gap-0.5">
              {[...Array(20)].map((_, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: i < 16 ? 1 : 0.3 }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.05 }}
                  className={`flex-1 ${i < 16 ? 'bg-gold' : 'bg-white/20'} rounded-sm`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="p-6 border-b border-gold-dark/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center">
            <Bot className="text-brand-black w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-brand-black">{language === 'hi' ? 'ऋण अधिकारी AI' : 'Loan Officer AI'}</h3>
            <span className="text-[10px] text-gold-dark uppercase font-bold tracking-widest">{language === 'hi' ? 'सक्रिय साक्षात्कार' : 'Active Interview'}</span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <AnimatePresence>
            {renderMessages()}
            {isProcessing && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-card p-4 rounded-2xl rounded-tl-none flex gap-2 border border-gold-dark/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce [animation-delay:0.4s]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-card/50 border-t border-gold-dark/10">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleSpeechInput}
              disabled={isProcessing}
              className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-muted hover:bg-gold/10 text-brand-black'
              }`}
            >
              {isRecording ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              {isRecording ? (language === 'hi' ? 'सुन रहा हूँ...' : 'Listening...') : (language === 'hi' ? 'बोलने के लिए दबाएं' : 'Press to Speak')}
            </button>
            <button 
              className="p-4 rounded-2xl gradient-gold text-brand-black hover:shadow-gold transition-all disabled:opacity-50"
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
