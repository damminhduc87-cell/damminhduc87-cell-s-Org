import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { purgeObsoleteStorage } from './services/safeStorage';

// Tự động dọn dẹp bộ nhớ cache phiên bản cũ ngay khi mở trang web
purgeObsoleteStorage();

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public declare props: Props;
  public state: State = {
    hasError: false
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
    if (error?.message && error.message.toLowerCase().includes('quota')) {
      purgeObsoleteStorage();
    }
  }

  private handleResetStorageAndReload = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Chỉ xóa các cache dữ liệu lớn, giữ lại thông tin người dùng nếu có
        localStorage.removeItem('mdlab_results_v7');
        localStorage.removeItem('mdlab_capas_v7');
        localStorage.removeItem('mdlab_tests_v7');
        purgeObsoleteStorage();
      }
    } catch (_) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isQuotaError = this.state.error?.message?.toLowerCase().includes('quota') ||
        this.state.error?.message?.toLowerCase().includes('exceeded');

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F1F3D',
          color: '#fff',
          fontFamily: 'sans-serif',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
            {isQuotaError ? 'Bộ nhớ đệm trên thiết bị đã đầy' : 'Đã xảy ra sự cố hiển thị trong ứng dụng'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '480px', marginBottom: '24px', lineHeight: '1.6' }}>
            {isQuotaError
              ? 'Trình duyệt di động bị giới hạn bộ nhớ cục bộ (Storage Quota). Hệ thống đã tự động dọn dẹp các bản lưu trữ cũ. Bấm nút bên dưới để mở lại ứng dụng.'
              : (this.state.error?.message || 'Có lỗi phát sinh khi tải giao diện.')}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleResetStorageAndReload}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2563EB',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
              }}
            >
              Dọn bộ nhớ & Tải lại ứng dụng
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 20px',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
