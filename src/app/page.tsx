import Link from 'next/link';
import { Shield, Zap, Lock, ArrowRight, Play } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="text-center py-20 px-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-8 animate-fade-in">
          <Zap className="w-4 h-4" />
          Powered by Gemini 1.5 Pro
        </div>
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
          Agentic AI <span className="text-transparent bg-clip-text gradient-primary">Loan Onboarding</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          The future of secure lending. Instant identity verification, live AI video interviews, and real-time risk scoring.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link 
            href="/auth" 
            className="px-8 py-4 rounded-2xl gradient-primary text-white font-bold text-lg flex items-center gap-3 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95"
          >
            Start My Application <ArrowRight className="w-5 h-5" />
          </Link>
          <button className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-lg flex items-center gap-3 hover:bg-white/10 transition-all">
            <Play className="w-5 h-5" /> Watch Demo
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-20 px-4 w-full">
        <FeatureCard 
          icon={<Shield className="w-8 h-8 text-primary" />}
          title="Secure KYC"
          description="Instant government ID parsing with automated age and face validation."
        />
        <FeatureCard 
          icon={<Zap className="w-8 h-8 text-accent" />}
          title="Live AI Interview"
          description="Engage in a natural conversation with our AI agent to verify loan purpose and income."
        />
        <FeatureCard 
          icon={<Lock className="w-8 h-8 text-green-500" />}
          title="Fraud Prevention"
          description="Advanced liveness detection and emotion signaling to identify potential risks."
        />
      </section>

      {/* Stats Section */}
      <section className="w-full bg-glass border border-white/10 rounded-[3rem] p-12 mt-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <Stat label="Processing Time" value="< 3 mins" />
          <Stat label="AI Accuracy" value="99.9%" />
          <Stat label="Fraud Detected" value="₹2.4Cr" />
          <Stat label="Happy Users" value="10k+" />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-glass border border-white/10 hover:border-primary/30 transition-all group">
      <div className="mb-6 p-4 rounded-2xl bg-white/5 w-fit group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <span className="block text-sm text-muted-foreground uppercase font-bold tracking-widest mb-2">{label}</span>
      <span className="text-3xl font-extrabold text-transparent bg-clip-text gradient-primary">{value}</span>
    </div>
  );
}
