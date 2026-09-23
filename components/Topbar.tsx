import React, { useState, useEffect } from 'react';
import { NavTabId } from './Sidebar';

interface TopbarProps {
  activeTab: NavTabId;
  onOpenMobileMenu: () => void;
  technician: string;
  warningCount: number;
  onOpenCapas: () => void;
  onOpenImport?: () => void;
  onOpenDriveSync?: () => void;
  isDriveConnected?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeTab,
  onOpenMobileMenu,
  technician,
  warningCount,
  onOpenCapas,
  onOpenImport,
  onOpenDriveSync,
  isDriveConnected
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('vi-VN', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) + ' • ' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabInfo: Record<NavTabId, { title: string; desc: string; breadcrumb: string }> = {
    dashboard: {
      title: 'Giám sát IQC & Biểu đồ Levey–Jennings',
      desc: 'Theo dõi xu hướng thống kê và đánh giá đa quy tắc Westgard thời gian thực',
      breadcrumb: 'Giám sát IQC'
    },
    worksheet: {
      title: 'Bảng kiểm nội kiểm mẻ đầu ngày',
      desc: 'Nhập nhanh kết quả kiểm soát hàng loạt theo máy phân tích',
      breadcrumb: 'Bảng kiểm đầu ngày'
    },
    entry: {
      title: 'Nhập kết quả nội kiểm đơn lẻ',
      desc: 'Kiểm tra tức thì giá trị đo và thẩm tra vi phạm Westgard tự động',
      breadcrumb: 'Nhập đơn lẻ'
    },
    capas: {
      title: 'Sổ tay biên bản xử lý sự cố CAPA',
      desc: 'Lưu trữ hồ sơ hành động khắc phục phòng ngừa theo Quyết định 2429/QĐ-BYT',
      breadcrumb: 'Biên bản CAPA'
    },
    config: {
      title: 'Cấu hình xét nghiệm & Máy phân tích',
      desc: 'Quản lý thông số Mean, SD, Số Lô QC, TEa% và danh mục máy xét nghiệm',
      breadcrumb: 'Cấu hình & Danh mục'
    },
    advisor: {
      title: 'Cố vấn AI Tiêu chuẩn 2429 & Westgard',
      desc: 'Trợ lý ảo phân tích nguyên nhân gốc rễ 5M và đề xuất biện pháp xử lý',
      breadcrumb: 'Cố vấn AI 2429'
    }
  };

  const current = tabInfo[activeTab] || tabInfo.dashboard;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] px-4 lg:px-8 py-3 transition-all">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left: Mobile Menu Trigger + Breadcrumbs + Titles */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
            title="Mở menu"
          >
            <i className="fas fa-bars text-sm"></i>
          </button>

          <div className="min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span className="hover:text-slate-600 transition-colors">QC Dashboard</span>
              <span>/</span>
              <span className="text-blue-600 font-semibold truncate">{current.breadcrumb}</span>
            </div>
            {/* Title & Subtitle */}
            <h2 className="text-sm md:text-base font-bold text-[#0F1F3D] leading-tight truncate mt-0.5">
              {current.title}
            </h2>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          {/* Drive Sync Status Button */}
          {onOpenDriveSync && (
            <button
              type="button"
              onClick={onOpenDriveSync}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                isDriveConnected
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="Cấu hình tự động lưu vào Google Drive"
            >
              <i className={`fab fa-google-drive ${isDriveConnected ? 'text-emerald-600' : 'text-slate-400'}`}></i>
              <span className="hidden sm:inline">
                {isDriveConnected ? 'Drive: Tự động lưu 🟢' : 'Kết nối Drive'}
              </span>
            </button>
          )}

          {/* Drive Import Button */}
          {onOpenImport && (
            <button
              type="button"
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Đồng bộ nạp dữ liệu từ Google Drive / Excel"
            >
              <i className="fas fa-cloud-upload-alt text-blue-600"></i>
              <span className="hidden sm:inline">Nạp từ Drive</span>
            </button>
          )}

          {/* Clock */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
            <i className="far fa-clock text-slate-400 text-xs"></i>
            <span>{currentTime}</span>
          </div>

          {/* Notification Button */}
          <button
            type="button"
            onClick={onOpenCapas}
            className="relative w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
            title={warningCount > 0 ? `Có ${warningCount} sự cố Westgard cần xử lý` : 'Không có sự cố nào'}
          >
            <i className="far fa-bell text-sm"></i>
            {warningCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                {warningCount}
              </span>
            )}
          </button>

          {/* User Profile avatar */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
              {technician.replace(/^KTV\.?\s*/i, '').charAt(0).toUpperCase() || 'N'}
            </div>
            <div className="hidden lg:block text-left">
              <span className="text-xs font-bold text-[#0F1F3D] block leading-none">
                {technician.replace(/^KTV\.?\s*/i, '') || 'Người thực hiện'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Người thực hiện</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
