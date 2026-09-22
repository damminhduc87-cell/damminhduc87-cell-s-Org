import React from 'react';

export type NavTabId = 'dashboard' | 'worksheet' | 'entry' | 'capas' | 'config' | 'advisor';

interface SidebarProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  technician: string;
  setTechnician: (tech: string) => void;
  capaCount: number;
  testCount: number;
  analyzerCount: number;
}

interface MenuItem {
  id: NavTabId;
  label: string;
  icon: string;
  badge?: number;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  isCollapsed,
  setIsCollapsed,
  technician,
  setTechnician,
  capaCount,
  testCount,
  analyzerCount
}) => {
  const menuGroups: MenuGroup[] = [
    {
      title: 'Tổng quan QC',
      items: [
        { id: 'dashboard', label: 'Giám sát IQC (Chart)', icon: 'fa-chart-line' },
        { id: 'worksheet', label: 'Bảng kiểm mẻ đầu ngày', icon: 'fa-table' },
        { id: 'entry', label: 'Nhập kết quả đơn lẻ', icon: 'fa-plus-circle' }
      ]
    },
    {
      title: 'Quản lý chất lượng',
      items: [
        { id: 'capas', label: 'Sổ tay biên bản CAPA', icon: 'fa-clipboard-check', badge: capaCount > 0 ? capaCount : undefined },
        { id: 'config', label: 'Cấu hình & Danh mục', icon: 'fa-sliders-h' }
      ]
    },
    {
      title: 'Trợ lý',
      items: [
        { id: 'advisor', label: 'Cố vấn AI 2429', icon: 'fa-robot' }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#0F1F3D] text-slate-300 transition-all duration-300 ease-in-out flex flex-col border-r border-[#1E2E4E] ${
          isCollapsed ? 'w-[72px]' : 'w-[248px]'
        } ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } lg:static`}
      >
        {/* Top Header & Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#1E2E4E] shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-900/30 shrink-0">
              <i className="fas fa-microscope text-sm"></i>
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-white font-black text-sm tracking-tight truncate leading-tight">
                  MinhDucLab QC
                </h1>
                <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase block">
                  QĐ 2429/QĐ-BYT
                </span>
              </div>
            )}
          </div>

          {/* Close for mobile */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* User / Technician Profile Card */}
        {!isCollapsed ? (
          <div className="mx-3 my-3 p-3 rounded-xl bg-[#182B4F] border border-[#233862] flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center text-xs font-bold">
                <i className="fas fa-user-md"></i>
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#182B4F]"></span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={technician}
                  onChange={e => setTechnician(e.target.value)}
                  placeholder="Tên KTV..."
                  className="bg-transparent text-xs font-bold text-white outline-none w-full border-b border-transparent focus:border-blue-400 transition-colors truncate"
                  title="Nhấn để đổi tên KTV trực máy"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] text-emerald-400 font-medium">Đang trực máy</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-3 flex justify-center border-b border-[#1E2E4E]">
            <div className="relative group cursor-pointer" title={`KTV: ${technician} (Đang trực)`}>
              <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center text-xs font-bold">
                <i className="fas fa-user-md"></i>
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0F1F3D]"></span>
            </div>
          </div>
        )}

        {/* Nav Menu Groups */}
        <nav className="flex-1 px-2.5 py-2 space-y-4 overflow-y-auto">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {group.title}
                </div>
              )}
              {group.items.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all relative group cursor-pointer ${
                      isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-3'
                    } ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-900/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#182B4F]'
                    }`}
                  >
                    {/* Left Active Indicator Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-white rounded-r"></span>
                    )}

                    <i className={`fas ${item.icon} ${isCollapsed ? 'text-base' : 'w-4 text-center text-sm'} ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                    }`}></i>

                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white leading-none">
                        {item.badge}
                      </span>
                    )}

                    {/* Tooltip on collapsed */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
                        {item.label}
                        {item.badge && ` (${item.badge})`}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer & Toggle Collapse */}
        <div className="p-3 border-t border-[#1E2E4E] bg-[#0C1933] flex items-center justify-between text-[11px] text-slate-400">
          {!isCollapsed ? (
            <>
              <div className="flex flex-col text-[10px] leading-tight text-slate-400">
                <span>{testCount} chỉ số • {analyzerCount} máy</span>
                <span className="text-[9px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ISO 15189:2022
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex w-7 h-7 rounded-lg hover:bg-[#182B4F] text-slate-400 hover:text-white items-center justify-center cursor-pointer transition-colors"
                title="Thu gọn sidebar"
              >
                <i className="fas fa-chevron-left text-xs"></i>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="hidden lg:flex w-full py-1.5 rounded-lg hover:bg-[#182B4F] text-slate-400 hover:text-white items-center justify-center cursor-pointer transition-colors"
              title="Mở rộng sidebar"
            >
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
