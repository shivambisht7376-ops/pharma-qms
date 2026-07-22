import React, { useState } from 'react';
import { User, AuthRole } from '../types';
import { DEMO_USERS } from '../data/mockData';
import { ShieldCheck, UserCheck, KeyRound, Sparkles, X, Lock, Mail, Building, UserPlus, LogIn } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'demo' | 'custom_login' | 'signup'>('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AuthRole>('QA_MANAGER');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: fullName || email.split('@')[0] || 'Quality Specialist',
      email: email || 'user@pharmagx.com',
      role: selectedRole,
      roleLabel: selectedRole === 'ADMIN' ? 'Quality Director' : selectedRole === 'QA_MANAGER' ? 'QA Manager' : selectedRole === 'QC_ANALYST' ? 'QC Lead' : 'Production Manager',
      department: 'Pharmaceutical Quality System',
      initials: (fullName || email || 'QS').substring(0, 2).toUpperCase(),
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    onLoginSuccess(newUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-xl text-slate-800">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-slate-200 text-slate-800 border border-slate-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">PharmaQMS Access & Authentication</h2>
              <p className="text-xs text-slate-500">Select a pre-configured demo account or log in</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 p-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('demo')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-1.5 ${
              activeTab === 'demo'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Demo Accounts</span>
          </button>
          <button
            onClick={() => setActiveTab('custom_login')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-1.5 ${
              activeTab === 'custom_login'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-1.5 ${
              activeTab === 'signup'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'demo' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Select a role to experience how different departments interact with the AI Co-Pilot Complaint Hub:
              </p>

              {DEMO_USERS.map((usr) => (
                <button
                  key={usr.id}
                  onClick={() => {
                    onLoginSuccess(usr);
                    onClose();
                  }}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${usr.badgeColor} shadow-sm`}>
                      {usr.initials}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900 group-hover:text-slate-800 transition-colors">
                          {usr.name}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${usr.badgeColor}`}>
                          {usr.roleLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{usr.email}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{usr.department}</p>
                    </div>
                  </div>
                  <UserCheck className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {(activeTab === 'custom_login' || activeTab === 'signup') && (
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              {activeTab === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserPlus className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Alexander Wright"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="name@pharmagx.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">QMS Functional Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as AuthRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="QA_MANAGER">QA Manager (Quality Assurance)</option>
                  <option value="ADMIN">Quality Director (Administrator)</option>
                  <option value="QC_ANALYST">QC Analyst (Quality Control Lab)</option>
                  <option value="PRODUCTION_MGR">Production Operations Manager</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors"
              >
                {activeTab === 'signup' ? 'Create QMS Account' : 'Sign In to QMS Workspace'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
