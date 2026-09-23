import React from 'react';
import { NavTabId } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  onOpenSync: () => void;
  onOpenMobileMenu: () => void;
  capaCount: number;
  isSyncing?: boolean;
  isDriveConnected?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSync,
  onOpenMobileMenu,
  capaCount,
  isSyncing,
  isDriveConnected
}) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1 px-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden safe-area-bottom">
      {/* 1. Giám sát IQC (Chart / Dashboard) */}
      <button
        type="button"
        onClick={() => setActiveTab('dashboard')}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
          activeTab === 'dashboard'
            ? 'text-blue-600 font-bold'
            : 'text-slate-400 hover:text-slate-600 font-medium'
        }`}
      >
        <div className="relative">
          <i className={`fas fa-chart-line text-base transition-transform ${activeTab === 'dashboard' ? 'scale-110' : ''}`}></i>
          {activeTab === 'dashboard' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600"></span>
          )}
        </div>
        <span className="text-[10px] mt-1 leading-tight tracking-tight">Giám sát</span>
      </button>

      {/* 2. Bảng kiểm mẻ đầu ngày (Worksheet) */}
      <button
        type="button"
        onClick={() => setActiveTab('worksheet')}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
          activeTab === 'worksheet'
            ? 'text-blue-600 font-bold'
            : 'text-slate-400 hover:text-slate-600 font-medium'
        }`}
      >
        <div className="relative">
          <i className={`fas fa-table text-base transition-transform ${activeTab === 'worksheet' ? 'scale-110' : ''}`}></i>
          {activeTab === 'worksheet' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600"></span>
          )}
        </div>
        <span className="text-[10px] mt-1 leading-tight tracking-tight">Bảng kiểm</span>
      </button>

      {/* 3. Nút Nhập QC Nổi Bật Ở Giữa (Elevated Action Button) */}
      <button
        type="button"
        onClick={() => setActiveTab('entry')}
        className="flex-1 flex flex-col items-center justify-center -mt-4 py-1 px-1 cursor-pointer group"
      >
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all ${
          activeTab === 'entry'
            ? 'bg-blue-700 shadow-blue-600/40 ring-3 ring-blue-100 scale-105'
            : 'bg-gradient-to-tr from-blue-600 to-blue-500 shadow-blue-600/30 hover:scale-105'
        }`}>
          <i className="fas fa-plus text-base"></i>
        </div>
        <span className={`text-[10px] mt-1 font-bold leading-tight tracking-tight ${
          activeTab === 'entry' ? 'text-blue-600' : 'text-slate-500'
        }`}>
          Nhập QC
        </span>
      </button>

      {/* 4. Sổ tay CAPA */}
      <button
        type="button"
        onClick={() => setActiveTab('capas')}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
          activeTab === 'capas'
            ? 'text-blue-600 font-bold'
            : 'text-slate-400 hover:text-slate-600 font-medium'
        }`}
      >
        <div className="relative">
          <i className={`fas fa-clipboard-check text-base transition-transform ${activeTab === 'capas' ? 'scale-110' : ''}`}></i>
          {capaCount > 0 && (
            <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center ring-1 ring-white">
              {capaCount}
            </span>
          )}
          {activeTab === 'capas' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600"></span>
          )}
        </div>
        <span className="text-[10px] mt-1 leading-tight tracking-tight">Sổ CAPA</span>
      </button>

      {/* 5. Đồng bộ & Kết nối */}
      <button
        type="button"
        onClick={onOpenSync}
        className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-400 hover:text-blue-600 transition-all cursor-pointer relative font-medium"
      >
        <div className="relative">
          <i className={`fas fa-cloud-arrow-down text-base ${isSyncing ? 'animate-spin text-blue-600' : ''}`}></i>
          {isDriveConnected && (
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white"></span>
          )}
        </div>
        <span className="text-[10px] mt-1 leading-tight tracking-tight">Đồng bộ</span>
      </button>
    </nav>
  );
};
