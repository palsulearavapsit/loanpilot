'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  ArrowUpRight, 
  BarChart3, 
  Users, 
  AlertTriangle,
  FileText,
  Clock,
  MapPin,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Download,
  Loader2,
  LayoutDashboard,
  Settings,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('queue');
  const [applications, setApplications] = useState<any[]>([]);
  const [filteredApps, setFilteredApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [stats, setStats] = useState({ active: 0, approvalRate: 0, pending: 0, fraudAlerts: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedAppLogs, setSelectedAppLogs] = useState<any[]>([]);
  const [selectedAppTranscript, setSelectedAppTranscript] = useState<any[]>([]);

  const fetchApps = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('loan_applications')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setApplications(data);
      calculateStats(data);
    }
    setIsLoading(false);
  };

  const fetchAppDetails = async (appId: string) => {
    const supabase = createClient();
    
    const [logsRes, transcriptRes] = await Promise.all([
      supabase.from('verification_logs').select('*').eq('application_id', appId).order('created_at', { ascending: true }),
      supabase.from('interview_transcripts').select('*').eq('application_id', appId).order('created_at', { ascending: true })
    ]);

    if (!logsRes.error) setSelectedAppLogs(logsRes.data || []);
    if (!transcriptRes.error) setSelectedAppTranscript(transcriptRes.data || []);
  };

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    let result = applications;
    if (activeTab === 'queue') {
      result = applications.filter(app => app.status === 'UNDER_REVIEW' || app.status === 'PENDING');
    } else if (activeTab === 'approved') {
      result = applications.filter(app => app.status === 'APPROVED');
    }
    
    if (searchQuery) {
      result = result.filter(app => 
        app.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredApps(result);
  }, [applications, activeTab, searchQuery]);

  const calculateStats = (data: any[]) => {
    const active = data.filter(a => ['PENDING', 'UNDER_REVIEW', 'ID_VERIFIED'].includes(a.status)).length;
    const pending = data.filter(a => a.status === 'UNDER_REVIEW').length;
    const approved = data.filter(a => a.status === 'APPROVED').length;
    const rejected = data.filter(a => a.status === 'REJECTED').length;
    const rate = data.length > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0;
    const alerts = data.filter(a => a.risk_score > 70).length;

    setStats({
      active,
      approvalRate: rate || 0,
      pending,
      fraudAlerts: alerts
    });
  };

  const handleReview = (app: any) => {
    setSelectedApp(app);
    setIsReviewing(true);
    fetchAppDetails(app.id);
  };

  const exportPDF = async (appId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('generate-loan-pdf', {
        body: { application_id: appId }
      });
      if (error) throw error;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LoanPilot-Audit-${appId}.json`;
      a.click();
    } catch (err) {
      alert("Failed to generate audit report");
    }
  };

  const viewGeo = (geo: any) => {
    if (geo?.lat && geo?.lng) {
      alert(`Applicant Location: ${geo.lat}, ${geo.lng}\nRegion Supported: ${geo.is_supported_region ? 'YES' : 'NO'}`);
    } else {
      alert("No geolocation data available for this session.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('loan_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (!error) {
      setIsReviewing(false);
      fetchApps();
    } else {
      alert(error.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 border-r border-gold-dark/10 p-8 flex-col gap-10 bg-card/30 fixed h-full">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold">
            <ShieldCheck className="w-6 h-6 text-brand-black" />
          </div>
          <span className="font-black text-xl tracking-tighter text-brand-black">LoanPilot <span className="text-gold-dark">HQ</span></span>
        </div>

        <nav className="space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Risk Overview" active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} />
          <SidebarItem icon={<Users size={20} />} label="Applicants" active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
          <SidebarItem icon={<ShieldCheck size={20} />} label="Approved" active={activeTab === 'approved'} onClick={() => setActiveTab('approved')} />
          <SidebarItem icon={<AlertTriangle size={20} />} label="Fraud Watch" />
        </nav>

        <div className="mt-auto space-y-2">
          <SidebarItem icon={<Bell size={20} />} label="Notifications" badge="3" />
          <SidebarItem icon={<Settings size={20} />} label="Control Panel" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-6 sm:p-10 space-y-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-brand-black">Risk Control Center</h1>
            <p className="text-muted-foreground font-medium">System-wide monitoring & manual decision overrides.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white px-5 py-2.5 rounded-2xl border border-gold-dark/15 flex items-center gap-3 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-widest text-brand-black">AI Engine: Optimized</span>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
          <StatCard icon={<Users className="text-gold-dark" />} label="Total Volume" value={applications.length.toString()} />
          <StatCard icon={<BarChart3 className="text-gold-dark" />} label="Pass Rate" value={`${stats.approvalRate}%`} />
          <StatCard icon={<ShieldAlert className="text-yellow-600" />} label="Attention Needed" value={stats.pending.toString()} />
          <StatCard icon={<AlertTriangle className="text-red-600" />} label="Risk Alerts" value={stats.fraudAlerts.toString()} />
        </div>

        {/* Main Table Card */}
        <div className="bg-white border-2 border-gold/40 rounded-[3rem] overflow-hidden shadow-gold-lg">
          <div className="p-8 border-b border-gold-dark/10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-card/20">
            <div className="flex items-center gap-3 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
              <TabButton active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} label="Active Queue" />
              <TabButton active={activeTab === 'approved'} onClick={() => setActiveTab('approved')} label="Approved" />
              <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All Logs" />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search by ID or Name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-gold-dark/15 rounded-2xl pl-11 pr-5 py-3 text-sm text-brand-black focus:outline-none focus:ring-4 ring-gold/10 transition-all placeholder:text-muted-foreground w-full xl:w-80" 
                />
              </div>
              <button className="p-3.5 rounded-2xl bg-white border border-gold-dark/15 hover:border-gold transition-all shadow-sm">
                <Filter className="w-4 h-4 text-brand-black/70" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-card/40 text-[11px] uppercase tracking-widest font-black text-muted-foreground/60 border-b border-gold-dark/5">
                  <th className="px-8 py-5">Applicant Profile</th>
                  <th className="px-8 py-5">Loan Details</th>
                  <th className="px-8 py-5">Risk Matrix</th>
                  <th className="px-8 py-5">System Status</th>
                  <th className="px-8 py-5">Timestamp</th>
                  <th className="px-8 py-5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-dark/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-gold-dark" />
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Accessing Audit Vault...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center">
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No matching records found</p>
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-gold/5 transition-all group cursor-pointer" onClick={() => handleReview(app)}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center font-bold text-gold-dark text-sm">
                            {app.profiles?.full_name?.[0] || 'A'}
                          </div>
                          <div>
                            <div className="font-bold text-brand-black">{app.profiles?.full_name || 'Anonymous'}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate w-24">{app.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-brand-black text-sm">₹{app.amount?.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{app.purpose || 'General Loan'}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 w-20 bg-gold/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${app.risk_score > 70 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : app.risk_score > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${app.risk_score || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-brand-black">{app.risk_score || 0}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-8 py-6 text-xs font-medium text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          className="px-5 py-2.5 rounded-2xl bg-white border border-gold-dark/15 text-gold-dark text-[10px] font-black uppercase tracking-widest hover:gradient-gold hover:text-brand-black hover:border-transparent transition-all shadow-sm"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewing && selectedApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReviewing(false)}
              className="absolute inset-0 bg-brand-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-5xl bg-white rounded-[4rem] shadow-[0_32px_120px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] border border-white/20"
            >
              <div className="p-8 border-b border-gold-dark/10 flex items-center justify-between gradient-gold/5 bg-card/30">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[2rem] gradient-gold flex items-center justify-center shadow-gold-lg">
                    <ShieldCheck className="w-8 h-8 text-brand-black" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-brand-black tracking-tighter">Application Protocol</h2>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Case ID: {selectedApp.id}</p>
                  </div>
                </div>
                <button onClick={() => setIsReviewing(false)} className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gold/10 transition-colors group">
                  <XCircle className="w-8 h-8 text-muted-foreground group-hover:text-red-500 transition-colors" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 scrollbar-hide">
                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <DetailBox icon={<Users />} label="Applicant Name" value={selectedApp.profiles?.full_name} subValue={selectedApp.profiles?.email} />
                  <DetailBox icon={<FileText />} label="Principal Amount" value={`₹${selectedApp.amount?.toLocaleString()}`} subValue={selectedApp.purpose || 'Capital Expenditure'} />
                  <DetailBox 
                    icon={<AlertTriangle className={selectedApp.risk_score > 50 ? 'text-red-500' : 'text-gold-dark'} />} 
                    label="Risk Classification" 
                    value={`${selectedApp.risk_score}% Severity`} 
                    subValue={selectedApp.risk_score > 70 ? 'Manual Intervention Mandatory' : 'System Recommendation: Low Risk'} 
                  />
                </div>

                {/* AI Rationale */}
                <div className="bg-card/40 border-2 border-gold/20 p-8 rounded-[3rem] shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gold-dark mb-6 flex items-center gap-3">
                    <BarChart3 className="w-5 h-5" /> Intelligence Decision Engine
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <span className="block text-[11px] text-muted-foreground uppercase font-black tracking-widest">Neural Signals</span>
                      <div className="grid grid-cols-1 gap-3">
                        {selectedApp.decision_rationale?.risk_breakdown?.map((item: string, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gold-dark/10">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-sm font-bold text-brand-black">{item}</span>
                          </div>
                        )) || <div className="p-4 rounded-2xl bg-white border border-gold-dark/10 italic text-muted-foreground text-sm">No signals recorded</div>}
                      </div>
                    </div>
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl bg-white border border-gold-dark/10">
                          <span className="block text-[10px] text-muted-foreground uppercase font-black mb-1">Bureau Score</span>
                          <span className="text-2xl font-black text-brand-black">{selectedApp.decision_rationale?.bureau_score || '720+'}</span>
                        </div>
                        <div className="p-6 rounded-3xl bg-white border border-gold-dark/10">
                          <span className="block text-[10px] text-muted-foreground uppercase font-black mb-1">Stability</span>
                          <span className="text-2xl font-black text-brand-black">94%</span>
                        </div>
                      </div>
                      <div className="p-6 rounded-3xl bg-white border border-gold-dark/10">
                        <span className="block text-[10px] text-muted-foreground uppercase font-black mb-1">Employment Context</span>
                        <span className="text-xl font-black text-brand-black">{selectedApp.employment_type || 'Salaried Professional'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-brand-black flex items-center gap-3">
                    <Clock className="w-5 h-5" /> Verification Protocol Timeline
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedAppLogs.length > 0 ? (
                      selectedAppLogs.map((log, i) => (
                        <LogItem 
                          key={log.id} 
                          event={log.event_type.replace(/_/g, ' ')} 
                          status={log.status} 
                          time={new Date(log.created_at).toLocaleTimeString()} 
                        />
                      ))
                    ) : (
                      <div className="p-8 rounded-3xl border-2 border-dashed border-gold-dark/10 text-center">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Awaiting Verification Telemetry...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transcript */}
                {selectedAppTranscript.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-brand-black flex items-center gap-3">
                      <MessageSquare className="w-5 h-5" /> Audit Transcript (Gemini AI)
                    </h3>
                    <div className="p-8 rounded-[3rem] bg-brand-black/[0.02] border border-gold-dark/5 space-y-6">
                      {selectedAppTranscript.map((msg, i) => (
                        <div key={msg.id} className="flex flex-col gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-fit ${msg.speaker === 'AI' ? 'bg-gold/20 text-gold-dark' : 'bg-brand-black/10 text-brand-black'}`}>
                            {msg.speaker}
                          </span>
                          <p className="text-sm text-brand-black leading-relaxed font-medium">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-10 bg-card/50 border-t border-gold-dark/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => exportPDF(selectedApp.id)}
                    className="px-6 py-3.5 rounded-2xl bg-white border border-gold-dark/15 text-brand-black hover:bg-gold/10 transition-all flex items-center gap-3 text-sm font-bold shadow-sm"
                  >
                    <Download className="w-5 h-5" /> Export PDF Audit
                  </button>
                  <button 
                    onClick={() => viewGeo(selectedApp.geo_location)}
                    className="px-6 py-3.5 rounded-2xl bg-white border border-gold-dark/15 text-brand-black hover:bg-gold/10 transition-all flex items-center gap-3 text-sm font-bold shadow-sm"
                  >
                    <MapPin className="w-5 h-5" /> View Geolocation
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => updateStatus(selectedApp.id, 'REJECTED')}
                    className="px-10 py-4 rounded-2xl bg-white text-red-600 border-2 border-red-500/20 font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-transparent transition-all shadow-sm"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => updateStatus(selectedApp.id, 'APPROVED')}
                    className="px-10 py-4 rounded-2xl gradient-gold text-brand-black font-black uppercase tracking-widest shadow-gold hover:shadow-gold-lg transition-all gold-glow"
                  >
                    Approve Loan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick, badge }: { icon: any, label: string, active?: boolean, onClick?: () => void, badge?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all group ${
        active 
          ? 'bg-gold text-brand-black font-black shadow-gold' 
          : 'text-muted-foreground hover:bg-gold/10 hover:text-gold-dark'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-bold tracking-tight">{label}</span>
      </div>
      {badge && (
        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm group-hover:scale-110 transition-transform">
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-white border border-gold-dark/15 shadow-gold hover:shadow-gold-lg transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
        {React.cloneElement(icon as React.ReactElement, { size: 80 })}
      </div>
      <div className="flex items-center justify-between mb-6">
        <div className="p-4 rounded-[1.25rem] bg-card border border-gold-dark/5 group-hover:scale-110 transition-transform text-gold-dark shadow-sm">{icon}</div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-green-600 font-black uppercase tracking-widest">Real-time</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mt-1" />
        </div>
      </div>
      <span className="block text-[11px] text-muted-foreground font-black uppercase tracking-[0.2em] mb-2">{label}</span>
      <span className="text-4xl font-black text-brand-black tracking-tighter">{value}</span>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
        active 
          ? 'gradient-gold text-brand-black shadow-gold' 
          : 'hover:bg-gold/10 text-muted-foreground hover:text-gold-dark'
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    'APPROVED': 'bg-green-500/10 text-green-600 border-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.1)]',
    'REJECTED': 'bg-red-500/10 text-red-600 border-red-500/20',
    'UNDER_REVIEW': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    'PENDING': 'bg-gold/10 text-gold-dark border-gold/20'
  };
  const icons: any = {
    'APPROVED': <CheckCircle2 className="w-3.5 h-3.5" />,
    'REJECTED': <XCircle className="w-3.5 h-3.5" />,
    'UNDER_REVIEW': <Clock className="w-3.5 h-3.5" />,
    'PENDING': <AlertTriangle className="w-3.5 h-3.5" />,
  };
  return (
    <span className={`px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${styles[status] || 'bg-muted text-brand-black border-gold-dark/15'}`}>
      {icons[status] || <Clock className="w-3.5 h-3.5" />}
      {status?.replace('_', ' ') || 'UNKNOWN'}
    </span>
  );
}

function DetailBox({ icon, label, value, subValue }: { icon: any, label: string, value: string, subValue?: string }) {
  return (
    <div className="p-6 rounded-[2rem] bg-card/30 border border-gold-dark/10 flex items-start gap-5 hover:border-gold transition-colors">
      <div className="p-3.5 rounded-2xl bg-white border border-gold-dark/10 text-gold-dark shadow-sm">
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="block text-[10px] text-muted-foreground uppercase font-black tracking-widest">{label}</span>
        <span className="block text-xl font-black text-brand-black tracking-tight">{value || 'NOT_SET'}</span>
        {subValue && <span className="block text-[10px] text-muted-foreground font-bold truncate max-w-[180px]">{subValue}</span>}
      </div>
    </div>
  );
}

function LogItem({ event, status, time }: { event: string, status: string, time: string }) {
  return (
    <div className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white border border-gold-dark/5 hover:border-gold/40 hover:shadow-md transition-all group">
      <div className="flex items-center gap-4">
        <div className="w-2.5 h-2.5 rounded-full bg-gold-dark group-hover:scale-125 transition-transform" />
        <span className="text-sm font-black text-brand-black uppercase tracking-tight">{event}</span>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-[11px] font-black text-green-600 uppercase tracking-[0.1em] px-3 py-1 bg-green-500/5 rounded-full">{status}</span>
        <span className="text-[11px] font-mono font-bold text-muted-foreground/60">{time}</span>
        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-20 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
      </div>
    </div>
  );
}

}
