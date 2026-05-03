'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Search,
  LayoutDashboard,
  Bell,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, flagged: 0, approved: 0 });

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('loan_applications')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false });
    
    if (data) {
      setApplications(data);
      setStats({
        total: data.length,
        pending: data.filter(a => a.status === 'UNDER_REVIEW').length,
        flagged: data.filter(a => a.risk_score < 40).length,
        approved: data.filter(a => a.status === 'APPROVED').length
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tight">LoanPilot Admin</span>
        </div>

        <nav className="space-y-1">
          <NavItem icon={<LayoutDashboard size={18} />} label="Overview" active />
          <NavItem icon={<Users size={18} />} label="Applicants" />
          <NavItem icon={<FileText size={18} />} label="Applications" />
          <NavItem icon={<AlertTriangle size={18} />} label="Flagged" />
        </nav>

        <div className="mt-auto space-y-1">
          <NavItem icon={<Bell size={18} />} label="Notifications" />
          <NavItem icon={<Settings size={18} />} label="Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Overview</h1>
            <p className="text-muted-foreground text-sm">Welcome back, Agentic Admin.</p>
          </div>
          
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search applications..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 ring-primary/50 transition-all"
            />
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          <StatCard icon={<FileText className="text-blue-500" />} label="Total Apps" value={stats.total} />
          <StatCard icon={<AlertTriangle className="text-yellow-500" />} label="Pending" value={stats.pending} />
          <StatCard icon={<AlertTriangle className="text-red-500" />} label="High Risk" value={stats.flagged} />
          <StatCard icon={<CheckCircle2 className="text-green-500" />} label="Approved" value={stats.approved} />
        </div>

        {/* AI Queue & System Health */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="col-span-2 bg-white/5 border border-white/10 p-6 rounded-[2rem]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold">AI Processing Queue</h3>
              <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-1 rounded-full font-bold uppercase tracking-widest">System Healthy</span>
            </div>
            <div className="space-y-4">
              <QueueItem label="ID Verification (Vision)" load={12} status="Optimized" />
              <QueueItem label="Agentic Interview (Gemini)" load={85} status="Scaling" color="text-yellow-500" />
              <QueueItem label="Risk Scoring Engine" load={4} status="Idle" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between">
            <h3 className="font-bold text-sm mb-4">Average Latency</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">1.2</span>
              <span className="text-sm font-bold opacity-50 uppercase">Seconds</span>
            </div>
            <div className="mt-4 h-16 flex items-end gap-1">
              {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                <div key={i} className="flex-1 bg-primary/40 rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="font-bold">Recent Applications</h2>
          </div>
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-xs uppercase text-muted-foreground font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Risk Score</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{app.profiles?.full_name}</span>
                      <span className="text-[10px] text-muted-foreground">{app.profiles?.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">₹{app.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${app.risk_score > 70 ? 'bg-green-500' : app.risk_score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                          style={{ width: `${app.risk_score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold">{app.risk_score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[10px] uppercase font-bold text-primary hover:underline">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

const NavItem = ({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
    active ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-white/5 hover:text-white'
  }`}>
    {icon}
    {label}
  </button>
);

const StatCard = ({ icon, label, value }: { icon: any, label: string, value: number }) => (
  <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors: any = {
    'APPROVED': 'bg-green-500/10 text-green-500 border-green-500/20',
    'REJECTED': 'bg-red-500/10 text-red-500 border-red-500/20',
    'UNDER_REVIEW': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'PENDING': 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${colors[status] || 'bg-white/10 text-white border-white/20'}`}>
      {status}
    </span>
  );
};

const QueueItem = ({ label, load, status, color = 'text-green-500' }: { label: string, load: number, status: string, color?: string }) => (
  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
    <div className="flex flex-col">
      <span className="text-sm font-bold">{label}</span>
      <span className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>{status}</span>
    </div>
    <div className="flex items-center gap-4">
      <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${load}%` }} />
      </div>
      <span className="text-xs font-mono w-8">{load}%</span>
    </div>
  </div>
);
