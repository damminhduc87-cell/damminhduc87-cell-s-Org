import React, { useState } from 'react';
import { LabTest, QCResult } from '../types';
import { APPS_SCRIPT_TEMPLATE, testWebhookConnection, syncResultsToGoogleSheets } from '../services/googleSheetsSync';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  onSaveWebhookUrl: (url: string) => void;
  autoSync: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  tests: LabTest[];
  results: QCResult[];
  onAddToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  onSaveWebhookUrl,
  autoSync,
  onToggleAutoSync,
  tests,
  results,
  onAddToast
}) => {
  const [inputUrl, setInputUrl] = useState(webhookUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'guide'>('config');

  if (!isOpen) return null;

  const isConnected = !!webhookUrl && webhookUrl.startsWith('https://script.google.com/');

  const handleSaveUrl = () => {
    const trimmed = inputUrl.trim();
    onSaveWebhookUrl(trimmed);
    setTestResult(null);
    onAddToast('success', 'Đã lưu cấu hình', 'Đã cập nhật Webhook URL Google Drive.');
  };

  const handleTestConnection = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setTestResult({ success: false, message: 'Vui lòng nhập Webhook URL trước khi kiểm tra.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testWebhookConnection(trimmed);
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      onSaveWebhookUrl(trimmed);
      onAddToast('success', 'Kết nối thành công', 'Đã liên kết thành công với Google Sheets trên Google Drive của bạn!');
    } else {
      onAddToast('error', 'Kết nối thất bại', res.message);
    }
  };

  const handleSyncAllHistory = async () => {
    if (!webhookUrl) {
      onAddToast('warning', 'Chưa có Webhook', 'Vui lòng nhập và kiểm tra kết nối Webhook URL trước.');
      return;
    }

    if (results.length === 0) {
      onAddToast('info', 'Không có dữ liệu', 'Chưa có kết quả nội kiểm nào trong hệ thống để đồng bộ.');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn đồng bộ toàn bộ ${results.length} kết quả nội kiểm hiện có lên Google Sheets?`)) {
      return;
    }

    setIsSyncingAll(true);
    const syncRes = await syncResultsToGoogleSheets(webhookUrl, results, tests);
    setIsSyncingAll(false);

    if (syncRes.success) {
      onAddToast('success', 'Đồng bộ toàn bộ thành công', `Đã ghi thành công ${syncRes.count} dòng kết quả vào bảng tính trên Google Drive!`);
    } else {
      onAddToast('error', 'Lỗi đồng bộ', syncRes.error || 'Không thể đồng bộ lên Google Sheets');
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    onAddToast('info', 'Đã sao chép', 'Đã sao chép toàn bộ mã Google Apps Script vào Clipboard!');
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-emerald-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-md shadow-emerald-600/20">
              <i className="fab fa-google-drive"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F1F3D] flex items-center gap-2">
                Tự động lưu dữ liệu vào Google Drive
                {isConnected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                    🟢 Đã kết nối
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                    ⚪ Chưa kết nối
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Đồng bộ thời gian thực sang bảng tính <span className="font-semibold text-emerald-700">NHẬT KÝ NỘI KIỂM IQC</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'config'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="fas fa-plug text-xs"></i>
            <span>Cấu hình kết nối</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'guide'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="fas fa-book-open text-xs"></i>
            <span>Hướng dẫn 4 bước (Lấy link Webhook)</span>
          </button>
        </div>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Webhook URL Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0F1F3D] block">
                  Đường dẫn Google Apps Script Webhook URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={inputUrl}
                    onChange={e => setInputUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-xs"
                  >
                    {isTesting ? (
                      <>
                        <i className="fas fa-spinner fa-spin text-xs"></i>
                        <span>Đang thử...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-satellite-dish text-xs"></i>
                        <span>Kiểm tra kết nối</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Chưa có Webhook URL? Bấm vào tab <strong>"Hướng dẫn 4 bước"</strong> ở trên để tạo trong 1 phút (hoàn toàn miễn phí).
                </p>
              </div>

              {/* Ping Test Result Alert */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <i
                    className={`fas mt-0.5 text-sm ${
                      testResult.success ? 'fa-check-circle text-emerald-600' : 'fa-exclamation-circle text-red-600'
                    }`}
                  ></i>
                  <div className="flex-1">
                    <span className="font-bold block">
                      {testResult.success ? 'Kết nối thành công!' : 'Kết nối thất bại:'}
                    </span>
                    <span className="text-[11px]">{testResult.message}</span>
                  </div>
                </div>
              )}

              {/* Toggles & Options */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#0F1F3D] block">
                      Tự động lưu vào Google Drive khi nhập kết quả
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Mỗi khi bạn bấm "Lưu kết quả" (Đơn lẻ hoặc Bảng kiểm), dữ liệu sẽ lập tức được gửi sang Google Sheets.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={e => onToggleAutoSync(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Bulk sync historical data */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-blue-900 block">
                    Đồng bộ toàn bộ lịch sử hiện tại ({results.length} kết quả)
                  </span>
                  <span className="text-[11px] text-blue-700/80 block mt-0.5">
                    Ghi tất cả kết quả nội kiểm đang có trong ứng dụng vào file Google Sheets trên Google Drive của bạn.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncAllHistory}
                  disabled={isSyncingAll || !isConnected}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  {isSyncingAll ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-xs"></i>
                      <span>Đang nạp lên Drive...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-cloud-upload-alt text-xs"></i>
                      <span>Đồng bộ toàn bộ lên Sheet</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Save Button */}
              {inputUrl !== webhookUrl && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveUrl}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <i className="fas fa-save"></i>
                    <span>Lưu địa chỉ Webhook</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-5 text-xs text-slate-700">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-800 text-[11px] flex items-center gap-2">
                <i className="fas fa-info-circle text-blue-600 text-sm"></i>
                <span>
                  Thực hiện 4 bước dưới đây trên máy tính chỉ mất đúng <strong>1 phút</strong>, hoàn toàn miễn phí và bảo mật của Google.
                </span>
              </div>

              <div className="space-y-4">
                {/* Bước 1 */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                  <div className="font-bold text-[#0F1F3D] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    Mở file Google Sheets
                  </div>
                  <p className="mt-1 text-slate-600 text-[11px] pl-7">
                    Mở file <strong>"NHẬT KÝ NỘI KIỂM IQC"</strong> trên Google Drive của bạn bằng trình duyệt.
                  </p>
                </div>

                {/* Bước 2 */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                  <div className="font-bold text-[#0F1F3D] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    Mở giao diện Apps Script
                  </div>
                  <p className="mt-1 text-slate-600 text-[11px] pl-7">
                    Trên thanh menu của Google Sheets, chọn: <strong>Tiện ích mở rộng (Extensions)</strong> &rarr; <strong>Apps Script</strong>.
                  </p>
                </div>

                {/* Bước 3 */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[#0F1F3D] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                      Dán đoạn mã Apps Script
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <i className={`fas ${copiedCode ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                      <span>{copiedCode ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                    </button>
                  </div>
                  <p className="text-slate-600 text-[11px] pl-7">
                    Xóa sạch nội dung hiện có trong tệp <code>Code.gs</code>, sau đó dán đoạn mã bên dưới vào:
                  </p>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[10.5px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                    {APPS_SCRIPT_TEMPLATE}
                  </pre>
                </div>

                {/* Bước 4 */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                  <div className="font-bold text-[#0F1F3D] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">4</span>
                    Triển khai (Deploy) và lấy Webhook URL
                  </div>
                  <ol className="mt-1 text-slate-600 text-[11px] pl-7 space-y-1 list-decimal list-inside">
                    <li>Nhấn nút <strong>Triển khai (Deploy)</strong> ở góc trên bên phải &rarr; chọn <strong>Tùy chọn triển khai mới (New deployment)</strong>.</li>
                    <li>Ở mục loại bánh răng, chọn <strong>Ứng dụng web (Web app)</strong>.</li>
                    <li>Ở mục <em>"Ai có quyền truy cập" (Who has access)</em>: chọn <strong>Bất kỳ ai (Anyone)</strong>.</li>
                    <li>Nhấn <strong>Triển khai (Deploy)</strong> &rarr; cấp quyền truy cập của Google &rarr; Sao chép đường link <strong>Web app URL</strong> (có đuôi <code>/exec</code>).</li>
                    <li>Quay lại app này, dán đường link vào ô ở tab <strong>"Cấu hình kết nối"</strong> và bấm <strong>Kiểm tra kết nối</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <i className="fas fa-shield-alt text-emerald-600"></i>
            <span>Dữ liệu được gửi trực tiếp vào Google Drive cá nhân của bạn, tuyệt đối bảo mật.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
