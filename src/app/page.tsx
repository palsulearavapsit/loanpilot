import Link from 'next/link';
import { Shield, Zap, Lock, ArrowRight, Play } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full">
      {/* Hero Section */}
      <section className="relative w-full text-center px-4 overflow-hidden flex flex-col items-center justify-center min-h-[90vh] py-12 ]">
        {/* Background Video - Subtle Watermark Effect */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ opacity: 0.4
           }}
        >
          <source src="/v1.mp4" type="video/mp4" />
        </video>

        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center mt-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gold-dark/30 text-gold-dark text-sm font-bold mb-8 animate-fade-in shadow-sm">
            <Zap className="w-4 h-4" style={{ color: '#D4AF37' }} />
            <span style={{ color: '#D39B2A' }}>Powered by Gemini 1.5 Pro</span>
          </div>
          <h1 className="text-6xl md:text-[5.5rem] font-black tracking-tight mb-8 leading-[1.1] text-brand-black">
            Agentic AI{' '}
            <span className="gradient-gold-text">Loan Onboarding</span>
          </h1>
          <p className="text-xl md:text-2xl text-brand-black/70 font-semibold mb-12 max-w-3xl mx-auto leading-relaxed">
            The future of secure lending. Instant identity verification, live AI video interviews, and real-time risk scoring.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/auth"
              className="px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-gold-lg text-brand-black gradient-gold gold-glow border-2 border-transparent"
            >
              Start My Application <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="px-8 py-4 rounded-2xl bg-white font-bold text-lg flex items-center gap-3 transition-all hover:scale-105 text-gold-dark border-2 border-gold/40 shadow-gold">
              <Play className="w-5 h-5" /> Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Wrapper */}
      <div className="w-full max-w-7xl mx-auto px-4 flex flex-col items-center">

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-20 px-4 w-full">
        <FeatureCard
          icon={<Shield className="w-8 h-8" style={{ color: '#D4AF37' }} />}
          title="Secure KYC"
          description="Instant government ID parsing with automated age and face validation."
        />
        <FeatureCard
          icon={<Zap className="w-8 h-8" style={{ color: '#EFC86E' }} />}
          title="Live AI Interview"
          description="Engage in a natural conversation with our AI agent to verify loan purpose and income."
        />
        <FeatureCard
          icon={<Lock className="w-8 h-8" style={{ color: '#D39B2A' }} />}
          title="Fraud Prevention"
          description="Advanced liveness detection and emotion signaling to identify potential risks."
        />
      </section>

      {/* Video Demo Section */}
      <section className="w-full px-4 mb-20">
        <div className="max-w-4xl mx-auto">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: 'rgba(212,175,55,0.2)' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#D39B2A' }}>
              See It In Action
            </span>
            <div className="h-px flex-1" style={{ background: 'rgba(212,175,55,0.2)' }} />
          </div>

          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-10 gradient-gold-text">
            Watch How LoanPilot Works
          </h2>

          {/* Video Container */}
          <div
            className="relative rounded-3xl overflow-hidden bg-card shadow-gold-lg"
            style={{
              border: '2px solid rgba(212,175,55,0.5)',
            }}
          >
            {/* Gold top accent bar */}
            <div className="h-1 w-full gradient-gold" />

            {/* 16:9 video wrapper */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <video
                className="absolute inset-0 w-full h-full object-cover"
                controls
                preload="metadata"
              >
                <source src="/v4.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              {/* Overlay play hint — hidden once video starts */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
                style={{ background: 'rgba(26,26,26,0.45)' }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg,#EFC86E,#D4AF37)',
                    boxShadow: '0 0 40px rgba(212,175,55,0.4)',
                  }}
                >
                  <Play className="w-8 h-8" style={{ color: '#1A1A1A', marginLeft: '4px' }} />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest" style={{ color: '#EFC86E' }}>
                  Full Product Demo
                </p>
              </div>
            </div>

            {/* Gold bottom accent */}
            <div className="px-8 py-4 flex items-center justify-between"
              style={{ background: 'rgba(212,175,55,0.06)', borderTop: '1px solid rgba(212,175,55,0.15)' }}
            >
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#D39B2A' }}>
                LoanPilot · AI-Powered Onboarding
              </span>
              <span className="text-xs" style={{ color: '#D4AF37' }}>3 mins end-to-end</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full bg-card rounded-[3rem] p-12 mt-4 mb-20"
        style={{ border: '2px solid rgba(212,175,55,0.4)' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <Stat label="Processing Time" value="< 3 mins" />
          <Stat label="AI Accuracy" value="99.9%" />
          <Stat label="Fraud Detected" value="₹2.4Cr" />
          <Stat label="Happy Users" value="10k+" />
        </div>
      </section>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-white border-2 border-gold/40 transition-all group hover:scale-[1.02] shadow-gold hover:shadow-gold-lg"
    >
      <div className="mb-6 p-4 rounded-2xl w-fit group-hover:scale-110 transition-transform"
        style={{ background: 'rgba(212,175,55,0.08)', borderTop: '3px solid #D39B2A' }}
      >
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4 text-brand-black">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs uppercase font-bold tracking-widest mb-2" style={{ color: '#D39B2A' }}>
        {label}
      </span>
      <span className="text-3xl font-extrabold gradient-gold-text">{value}</span>
    </div>
  );
}
