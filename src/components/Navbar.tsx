import React, { useState } from 'react';
import { User } from '../types';
import { DEMO_USERS } from '../data/mockData';
import { ShieldAlert, Bot, FileText, History, UserCheck, LogOut, ChevronDown, Sparkles, Building2, Layers } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  onOpenAuthModal: () => void;
  activeTab: 'copilot' | 'master_log' | 'audit_log';
  setActiveTab: (tab: 'copilot' | 'master_log' | 'audit_log') => void;
  totalComplaintsCount: number;
  criticalRiskCount: number;
  onViewComplaints: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSelectUser,
  onOpenAuthModal,
  activeTab,
  setActiveTab,
  totalComplaintsCount,
  criticalRiskCount,
  onViewComplaints,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold shadow-sm">
              Q
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold tracking-tight text-slate-800">
                  PharmaQMS
                </span>
                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wide">
                  API / FDF
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Quality Management & Complaint System
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges — clickable to navigate to master log */}
          <div className="hidden lg:flex items-center space-x-4 text-xs">
            <button
              id="nav-metric-total-complaints"
              onClick={onViewComplaints}
              title="View all complaints"
              className="flex items-center space-x-2 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 cursor-pointer transition-all group"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-500 group-hover:text-blue-600">Total Complaints:</span>
              <span className="font-bold text-slate-800 group-hover:text-blue-700">{totalComplaintsCount}</span>
            </button>
            <button
              id="nav-metric-critical-risks"
              onClick={onViewComplaints}
              title="View critical complaints"
              className="flex items-center space-x-2 bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 cursor-pointer transition-all group"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-slate-500 group-hover:text-rose-600">Critical Risks:</span>
              <span className="font-bold text-rose-600">{criticalRiskCount}</span>
            </button>
          </div>

          {/* Main Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              id="nav-tab-copilot"
              onClick={() => setActiveTab('copilot')}
              className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'copilot'
                  ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Bot className="w-4 h-4 text-blue-600" />
              <span>AI Co-Pilot Hub</span>
            </button>

            <button
              id="nav-tab-master-log"
              onClick={() => setActiveTab('master_log')}
              className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'master_log'
                  ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Complaints Log</span>
              <span className="sm:hidden">Log</span>
            </button>

            <button
              id="nav-tab-audit-log"
              onClick={() => setActiveTab('audit_log')}
              className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'audit_log'
                  ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">GMP Audit Trail</span>
              <span className="sm:hidden">Audit</span>
            </button>
          </nav>

          {/* User Account / Login Dropdown */}
          <div className="relative">
            {currentUser ? (
              <div className="relative">
                <button
                  id="user-profile-menu-button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-2.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full border border-slate-200 text-xs sm:text-sm transition-all text-slate-700"
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></div>
                  <div className="text-left hidden sm:block">
                    <div className="font-medium text-slate-800 leading-tight">{currentUser.name}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs text-slate-800">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                      <p className="font-bold text-slate-900">{currentUser.name}</p>
                      <p className="text-slate-500">{currentUser.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        {currentUser.roleLabel} • {currentUser.department}
                      </span>
                    </div>

                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Switch Demo Account
                    </div>

                    {DEMO_USERS.map((usr) => (
                      <button
                        key={usr.id}
                        onClick={() => {
                          onSelectUser(usr);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 flex items-center justify-between hover:bg-slate-50 transition-all ${
                          usr.id === currentUser.id ? 'bg-blue-50/60 font-semibold text-blue-600' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-slate-900 font-medium">{usr.name}</div>
                          <div className="text-[10px] text-slate-500">{usr.roleLabel}</div>
                        </div>
                        {usr.id === currentUser.id && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    ))}

                    <div className="border-t border-slate-100 mt-2 pt-1 px-2">
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenAuthModal();
                        }}
                        className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded flex items-center space-x-2 font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out / Switch Account</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="login-button"
                onClick={onOpenAuthModal}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Login / Demo Users</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
