'use client';

import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Search, Filter, ArrowUpRight, BarChart3, Users, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('queue');
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchApps = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('loan_applications')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });
      
      if (!error) setApplications(data);
      setIsLoading(false);
    };
    fetchApps();
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Control Center</h1>
          <p className="text-muted-foreground">Monitor and override AI-driven loan decisions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-glass px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">AI Engine Active</span>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={<Users className="text-primary" />} label="Active Sessions" value="24" />
        <StatCard icon={<BarChart3 className="text-accent" />} label="Approval Rate" value="68%" />
        <StatCard icon={<ShieldAlert className="text-yellow-500" />} label="Pending Review" value="12" />
        <StatCard icon={<AlertTriangle className="text-red-500" />} label="Fraud Alerts" value="3" />
      </div>

      {/* Main Content */}
      <div className="bg-glass border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'queue' ? 'bg-primary text-white' : 'hover:bg-white/5'}`}
            >
              Review Queue
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-primary text-white' : 'hover:bg-white/5'}`}
            >
              System Logs
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search applicants..." className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              <th className="px-6 py-4">Applicant</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Risk Score</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Signals</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold">{app.profiles?.full_name || 'Unknown'}</div>
                  <div className="text-[10px] text-muted-foreground">{app.id}</div>
                </td>
                <td className="px-6 py-4 font-mono">₹{app.amount?.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${app.risk_score > 70 ? 'bg-red-500' : app.risk_score > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${app.risk_score || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold">{app.risk_score || 0}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="text-[9px] text-muted-foreground">
                    {app.purpose}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button className="p-2 rounded-lg hover:bg-primary/20 hover:text-primary transition-all">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="p-6 rounded-2xl bg-glass border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-white/5">{icon}</div>
        <span className="text-xs text-green-500 flex items-center gap-1 font-bold">+12%</span>
      </div>
      <span className="block text-sm text-muted-foreground font-medium mb-1">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    'APPROVED': 'bg-green-500/10 text-green-500 border-green-500/20',
    'REJECTED': 'bg-red-500/10 text-red-500 border-red-500/20',
    'UNDER_REVIEW': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  };
  const icons: any = {
    'APPROVED': <CheckCircle2 className="w-3 h-3" />,
    'REJECTED': <XCircle className="w-3 h-3" />,
    'UNDER_REVIEW': <ShieldAlert className="w-3 h-3" />,
  };
  return (
    <span className={`px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-fit ${styles[status]}`}>
      {icons[status]}
      {status.replace('_', ' ')}
    </span>
  );
}
