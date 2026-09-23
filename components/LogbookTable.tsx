import React, { useState, useMemo } from 'react';
import { QCResult, LabTest, QCLevel } from '../types';
import { getWestgardStyle } from '../services/westgardEngine';

interface LogbookTableProps {
  results: QCResult[];
  activeTest: LabTest;
  onOpenCapa: (result: QCResult) => void;
  onDeleteResult: (e: React.MouseEvent, id: string) => void;
  onExportExcel: () => void;
  onOpenImport?: () => void;
}

export const LogbookTable: React.FC<LogbookTableProps> = ({
  results,
  activeTest,
  onOpenCapa,
  onDeleteResult,
  onExportExcel,
  onOpenImport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'warning' | 'violation'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | QCLevel>('all');
  const [selectedResultDetail, setSelectedResultDetail] = useState<QCResult | null>(null);

  // Lọc kết quả theo tìm kiếm, mức nồng độ và trạng thái
  const filteredResults = useMemo(() => {
    return results
      .filter(r => {
        if (levelFilter !== 'all' && r.level !== levelFilter) return false;
        if (statusFilter !== 'all' && r.westgardStatus !== statusFilter) return false;
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const tech = (r.technician || '').toLowerCase();
        const lot = (r.lotNumber || '').toLowerCase();
        const rule = (r.westgardRule || '').toLowerCase();
        const date = new Date(r.timestamp).toLocaleString('vi-VN').toLowerCase();
        return tech.includes(term) || lot.includes(term) || rule.includes(term) || date.includes(term);
      })
      .slice()
      .reverse(); // Mới nhất lên đầu
  }, [results, searchTerm, statusFilter, levelFilter]);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden transition-all">
      {/* Table Header & Controls Bar */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#0F1F3D]">
              Nhật ký kết quả nội kiểm (IQC Logbook)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              Hiển thị {filteredResults.length}/{results.length} bản ghi
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Lịch sử toàn bộ các lần đo nội kiểm và đối chiếu quy tắc Westgard
          </p>
        </div>

        {/* Action buttons: Nhập file & Xuất Excel */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenImport && (
            <button
              type="button"
              onClick={onOpenImport}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="Đồng bộ nạp dữ liệu từ Google Sheets hoặc file Excel"
            >
              <i className="fas fa-file-import text-blue-600"></i>
              <span>Nhập từ Google Drive (Excel)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            title="Tải sổ theo dõi nội kiểm dạng file Excel (.xlsx)"
          >
            <i className="fas fa-file-excel"></i>
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-50/60 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Search input */}
        <div className="sm:col-span-6 relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            placeholder="Tìm theo ngày giờ, số lô, người thực hiện, quy tắc..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 outline-none transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Level Filter Dropdown */}
        <div className="sm:col-span-3 relative">
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value as any)}
            className="w-full appearance-none bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-8"
          >
            <option value="all">Tất cả mức QC (Low/Norm/High)</option>
            <option value={QCLevel.LOW}>Mức Thấp (Low)</option>
            <option value={QCLevel.NORMAL}>Mức Chuẩn (Normal)</option>
            <option value={QCLevel.HIGH}>Mức Cao (High)</option>
          </select>
          <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
        </div>

        {/* Status Filter Dropdown */}
        <div className="sm:col-span-3 relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full appearance-none bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-8"
          >
            <option value="all">Tất cả trạng thái ({results.length})</option>
            <option value="passed">Chỉ xem Đạt chuẩn (Passed)</option>
            <option value="warning">Chỉ xem Cảnh báo (1-2s)</option>
            <option value="violation">Chỉ xem Vi phạm (Cần CAPA)</option>
          </select>
          <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
        </div>
      </div>

      {/* Mobile Card View (md:hidden) */}
      <div className="md:hidden divide-y divide-slate-100 p-3">
        {filteredResults.length === 0 ? (
          <div className="p-8 text-center text-slate-400 italic text-xs">
            Không tìm thấy bản ghi nội kiểm nào phù hợp với bộ lọc.
          </div>
        ) : (
          filteredResults.map(r => {
            const style = getWestgardStyle(r.westgardStatus || 'passed', r.westgardRule || 'none');
            const isViolation = r.westgardStatus === 'violation';

            return (
              <div
                key={r.id}
                className={`py-3 px-3 rounded-xl border transition-all mb-2 ${
                  isViolation
                    ? 'bg-red-50/40 border-red-200'
                    : r.westgardStatus === 'warning'
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-slate-200/80 shadow-2xs'
                }`}
              >
                {/* Top Row: Date & Level & Status Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
                      r.level === QCLevel.LOW ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      r.level === QCLevel.HIGH ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {r.level === QCLevel.LOW ? 'Thấp (L)' : r.level === QCLevel.HIGH ? 'Cao (H)' : 'Chuẩn (N)'}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 truncate">
                      {new Date(r.timestamp).toLocaleDateString('vi-VN')} {new Date(r.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 inline-flex items-center gap-1 ${style.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`}></span>
                    {r.westgardRule === 'none' ? 'Hợp lệ' : r.westgardRule}
                  </span>
                </div>

                {/* Middle Row: Value & Z-Score */}
                <div className="flex items-baseline justify-between bg-slate-50/80 p-2.5 rounded-lg mb-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                      Giá trị đo
                    </span>
                    <span className="text-base font-black text-slate-900">
                      {r.value} <span className="text-xs text-slate-500 font-medium">{activeTest.unit}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                      Z-score
                    </span>
                    <span className={`text-sm font-black ${style.textClass}`}>
                      {r.zScore > 0 ? '+' : ''}{r.zScore} SD
                    </span>
                  </div>
                </div>

                {/* Sub details: Machine, Lot, Tech & Action buttons */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-slate-700">
                      {activeTest.analyzerName || 'Máy Hóa sinh'}
                    </span>
                    <span>•</span>
                    <span>Lô: {r.lotNumber || '---'}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isViolation && !r.capaId && (
                      <button
                        type="button"
                        onClick={() => onOpenCapa(r)}
                        className="px-2 py-1 rounded-lg bg-red-600 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fas fa-plus-circle"></i> Lập CAPA
                      </button>
                    )}
                    {r.capaId && (
                      <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                        <i className="fas fa-check-circle text-emerald-600"></i> {r.capaId}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={e => onDeleteResult(e, r.id)}
                      className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Xóa kết quả này"
                    >
                      <i className="fas fa-trash-alt text-[10px]"></i>
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table Canvas (hidden md:block) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="px-4 py-3.5">Ngày giờ đo</th>
              <th className="px-4 py-3.5">Mức QC</th>
              <th className="px-4 py-3.5">Máy phân tích</th>
              <th className="px-4 py-3.5">Số Lô (Lot)</th>
              <th className="px-4 py-3.5">Giá trị đo</th>
              <th className="px-4 py-3.5">Độ lệch Z-score</th>
              <th className="px-4 py-3.5">Trạng thái Westgard</th>
              <th className="px-4 py-3.5">Biên bản CAPA</th>
              <th className="px-4 py-3.5">Người thực hiện</th>
              <th className="px-4 py-3.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-slate-400 italic">
                  Không tìm thấy bản ghi nội kiểm nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredResults.map(r => {
                const style = getWestgardStyle(r.westgardStatus || 'passed', r.westgardRule || 'none');
                const isViolation = r.westgardStatus === 'violation';

                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50/80 transition-colors group relative ${
                      isViolation ? 'bg-red-50/20' : ''
                    }`}
                  >
                    {/* Date with left red accent line if violation */}
                    <td className="px-4 py-3.5 font-medium text-slate-600 relative">
                      {isViolation && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></span>
                      )}
                      {new Date(r.timestamp).toLocaleString('vi-VN')}
                    </td>

                    {/* Level */}
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-block ${
                        r.level === QCLevel.LOW ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        r.level === QCLevel.HIGH ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {r.level === QCLevel.LOW ? 'Thấp (L)' : r.level === QCLevel.HIGH ? 'Cao (H)' : 'Chuẩn (N)'}
                      </span>
                    </td>

                    {/* Machine */}
                    <td className="px-4 py-3.5 font-semibold text-slate-700">
                      {activeTest.analyzerName || 'Máy Hóa sinh'}
                    </td>

                    {/* Lot */}
                    <td className="px-4 py-3.5 font-semibold text-slate-600">
                      {r.lotNumber || '---'}
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3.5 font-black text-slate-900 text-sm">
                      {r.value} <span className="text-[10px] text-slate-400 font-normal">{activeTest.unit}</span>
                    </td>

                    {/* Z-score */}
                    <td className={`px-4 py-3.5 font-black ${style.textClass}`}>
                      {r.zScore > 0 ? '+' : ''}{r.zScore} SD
                    </td>

                    {/* Westgard Status Badge */}
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border inline-flex items-center gap-1 ${style.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`}></span>
                        {r.westgardRule === 'none' ? 'Hợp lệ' : r.westgardRule}
                      </span>
                    </td>

                    {/* CAPA Status */}
                    <td className="px-4 py-3.5">
                      {r.capaId ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <i className="fas fa-check-circle text-emerald-500"></i> {r.capaId}
                        </span>
                      ) : isViolation ? (
                        <button
                          type="button"
                          onClick={() => onOpenCapa(r)}
                          className="px-2 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <i className="fas fa-plus-circle"></i> Lập CAPA
                        </button>
                      ) : (
                        <span className="text-slate-300">---</span>
                      )}
                    </td>

                    {/* Technician */}
                    <td className="px-4 py-3.5 text-slate-500 font-medium">
                      {r.technician ? r.technician.replace(/^KTV\.?\s*/i, '') : '---'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenCapa(r)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center cursor-pointer"
                          title="Xem chi tiết / Lập biên bản CAPA"
                        >
                          <i className="fas fa-file-alt text-xs"></i>
                        </button>
                        <button
                          type="button"
                          onClick={e => onDeleteResult(e, r.id)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer"
                          title="Xóa kết quả này"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span>Đã lưu vào bộ nhớ cục bộ an toàn theo ISO 15189</span>
        <span>Tổng {results.length} mẫu kiểm soát</span>
      </div>
    </div>
  );
};
