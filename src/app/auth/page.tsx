'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    try {
      if (isLogin) {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (signUpError) throw signUpError;
      }
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-glass border border-white/10 p-8 rounded-[2.5rem] shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="text-muted-foreground text-sm">
            {isLogin ? 'Sign in to continue your loan application' : 'Start your secure loan onboarding today'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                  name="fullName"
                  type="text" 
                  placeholder="John Doe"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                name="email"
                type="email" 
                placeholder="name@company.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                name="password"
                type="password" 
                placeholder="••••••••"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              {error}
            </div>
          )}

          <button 
            disabled={isLoading}
            className="w-full py-4 rounded-2xl gradient-primary font-bold text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
