import React, { useState } from 'react';
import { LabTest, QCResult } from '../types';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  onPullFromSheets: () => Promise<void>;
  onPushToSheets: () => Promise<void>;
  isSyncing: boolean;
  tests: LabTest[];
  results: QCResult[];
  onOpenAdvancedConfig: () => void;
  onAddToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  onPullFromSheets,
  onPushToSheets,
  isSyncing,
  tests,
  results,
  onOpenAdvancedConfig,
  onAddToast
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'cloud' | 'pwa'>('qr');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://damminhduc87-cell-s-org.vercel.app';
  const shareableUrl = `${currentHost}?sync_connect=1`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(shareableUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    onAddToast('success', 'Đã sao chép link', 'Bạn có thể gửi link này qua Zalo để mở ngay trên điện thoại.');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const isConnected = !!webhookUrl && webhookUrl.startsWith('https://script.google.com/');

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-7 max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-lg shrink-0">
              <i className="fas fa-mobile-screen-button"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0F1F3D] leading-tight">
                Đồng Bộ Thiết Bị & Điện Thoại
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Kết nối tức thì giữa Máy tính và Điện thoại di động
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl my-4 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className="fas fa-qrcode"></i>
            <span>Quét mã QR</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'cloud'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className="fas fa-cloud-arrow-down"></i>
            <span>Đồng bộ 2 chiều</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'pwa'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className="fas fa-arrow-up-from-bracket"></i>
            <span>Ghim ra MH chính</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: QR CODE PAIRING */}
          {activeTab === 'qr' && (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto shadow-xs">
                <img
                  src={qrCodeUrl}
                  alt="Mã QR mở trên điện thoại"
                  className="w-48 h-48 sm:w-52 sm:h-52 mx-auto rounded-xl object-contain bg-white p-2 border border-slate-100"
                />
                <span className="text-[11px] font-bold text-slate-500 block mt-2">
                  Dùng Camera điện thoại quét mã để mở ngay
                </span>
              </div>

              <div className="text-left bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-800">
                  <i className="fas fa-check-circle text-blue-600"></i>
                  <span>Tự động nhận diện cấu hình:</span>
                </div>
                <p className="text-xs text-blue-700 font-medium">
                  Khi quét mã, điện thoại sẽ tự động kết nối chung với file Google Drive của phòng xét nghiệm, nạp đầy đủ danh mục xét nghiệm và các kết quả mới nhất.
                </p>
              </div>

              {/* Copy Link Button */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 font-mono truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <i className={`fas ${copiedLink ? 'fa-check' : 'fa-copy'}`}></i>
                  <span>{copiedLink ? 'Đã chép link' : 'Sao chép link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CLOUD 2-WAY SYNC */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border flex items-center justify-between gap-3 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></div>
                  <div>
                    <span className="text-xs font-bold text-[#0F1F3D] block">
                      Google Drive Cloud Sync
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isConnected ? 'Đã kết nối Webhook hoạt động 🟢' : 'Chưa cấu hình Webhook'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenAdvancedConfig}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold underline cursor-pointer"
                >
                  Đổi Webhook
                </button>
              </div>

              {/* 2 Big Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Pull from Drive */}
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={onPullFromSheets}
                  className="p-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-left transition-all cursor-pointer shadow-xs disabled:opacity-50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-700">
                      1. Kéo dữ liệu về
                    </span>
                    <i className={`fas fa-cloud-arrow-down text-blue-600 text-sm ${isSyncing ? 'animate-bounce' : ''}`}></i>
                  </div>
                  <h4 className="text-sm font-bold text-[#0F1F3D]">
                    Tải từ Google Drive
                  </h4>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Nạp các kết quả vừa đo từ thiết bị khác về máy này.
                  </p>
                </button>

                {/* Push to Drive */}
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={onPushToSheets}
                  className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-left transition-all cursor-pointer shadow-xs disabled:opacity-50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
                      2. Đẩy dữ liệu lên
                    </span>
                    <i className={`fas fa-cloud-arrow-up text-emerald-600 text-sm ${isSyncing ? 'animate-bounce' : ''}`}></i>
                  </div>
                  <h4 className="text-sm font-bold text-[#0F1F3D]">
                    Gửi lên Google Drive
                  </h4>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Đồng bộ toàn bộ {results.length} kết quả hiện có lên Google Sheets.
                  </p>
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold block text-slate-700">💡 Cơ chế đồng bộ thông minh:</span>
                <p>
                  Dữ liệu được tự động gộp (merge) theo mốc thời gian và mã xét nghiệm. Bạn không lo bị trùng lặp kết quả khi tải qua lại giữa điện thoại và máy tính.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PWA / ADD TO HOME SCREEN */}
          {activeTab === 'pwa' && (
            <div className="space-y-4 text-xs">
              <div className="text-center p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                <span className="text-sm font-bold text-blue-900 block">
                  Trải nghiệm toàn màn hình như ứng dụng cài đặt (App)
                </span>
                <p className="text-slate-600 mt-1">
                  Khi ghim ra Màn hình chính, ứng dụng sẽ mở lên mượt mà, không có thanh địa chỉ web, tối ưu 100% diện tích màn hình điện thoại.
                </p>
              </div>

              {/* iOS Guide */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <i className="fab fa-apple text-base"></i>
                  <span>Đối với iPhone / iPad (Trình duyệt Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 font-medium leading-relaxed">
                  <li>Mở link web trên trình duyệt <strong>Safari</strong>.</li>
                  <li>Bấm vào biểu tượng <strong>Chia sẻ</strong> (hình ô vuông có mũi tên trỏ lên ở đáy màn hình Safari).</li>
                  <li>Cuộn xuống và chọn <strong>"Thêm vào Màn hình chính" (Add to Home Screen)</strong>.</li>
                  <li>Bấm <strong>Thêm</strong> ở góc trên bên phải để hoàn tất.</li>
                </ol>
              </div>

              {/* Android Guide */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <i className="fab fa-android text-base text-emerald-600"></i>
                  <span>Đối với điện thoại Android (Trình duyệt Chrome):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 font-medium leading-relaxed">
                  <li>Mở link web trên trình duyệt <strong>Chrome</strong>.</li>
                  <li>Bấm vào biểu tượng <strong>dấu 3 chấm ⋮</strong> ở góc trên bên phải màn hình.</li>
                  <li>Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong>.</li>
                  <li>Bấm <strong>Cài đặt / Thêm</strong> để xác nhận.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>MinhDucLab QC v3.0 • QĐ 2429/QĐ-BYT</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
