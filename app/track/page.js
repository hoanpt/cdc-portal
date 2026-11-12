'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import styles from './track.module.css';
import { useLanguage } from '@/lib/i18n';

function TrackContent() {
  const searchParams = useSearchParams();
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState(searchParams.get('id') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const STATUS_STEPS = [
    { 
      key: 'pending', 
      icon: 'fa-paper-plane', 
      label: lang === 'en' ? '1. Submitted' : '1. Nộp hồ sơ', 
      desc: lang === 'en' ? 'Application submitted successfully, awaiting cashier payment verification.' : 'Hồ sơ đã được gửi thành công, chờ Kế toán xác nhận thanh toán.' 
    },
    { 
      key: 'processing', 
      icon: 'fa-gears', 
      label: lang === 'en' ? '2. PCBTN Processing' : '2. PCBTN xử lý', 
      desc: lang === 'en' ? 'Payment verified & e-invoice issued. PCBTN Department is reviewing vaccination records.' : 'Kế toán đã xác nhận thu tiền & xuất HĐĐT. Khoa PCBTN đang đối chiếu tiêm chủng.' 
    },
    { 
      key: 'completed', 
      icon: 'fa-certificate', 
      label: lang === 'en' ? '3. Completed & Ready' : '3. Hoàn tất & Trả kết quả', 
      desc: lang === 'en' ? 'Completed. Official certificate and e-invoice are ready.' : 'Đã hoàn tất. Giấy chứng nhận và Hóa đơn điện tử đã sẵn sàng.' 
    },
  ];

  const STATUS_IDX = { pending: 0, received: 1, processing: 1, completed: 2 };

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) { setQuery(id); doSearch(id); }
  }, []);

  async function doSearch(id) {
    const q = (id || query).trim();
    if (!q) { 
      setError(lang === 'en' ? 'Please enter Application Code or Citizen ID / Passport' : 'Vui lòng nhập mã hồ sơ, số CCCD hoặc số Hộ chiếu'); 
      return; 
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) { 
        setError(data.error || (lang === 'en' ? 'Application not found' : 'Không tìm thấy hồ sơ')); 
        return; 
      }
      setResult(data);
      const url = new URL(window.location);
      url.searchParams.set('id', q);
      window.history.replaceState({}, '', url);
    } catch (e) {
      setError((lang === 'en' ? 'Connection error: ' : 'Lỗi kết nối: ') + e.message);
    } finally {
      setLoading(false);
    }
  }

  const currentIdx = result ? (STATUS_IDX[result.application.status] ?? 0) : -1;

  const methodLabel = {
    email: lang === 'en' ? 'Receive via Email' : 'Nhận qua Email',
    postal: lang === 'en' ? 'Postal Express Courier' : 'Nhận qua Bưu điện',
    direct: lang === 'en' ? 'Direct Pickup at Danang CDC' : 'Nhận trực tiếp tại CDC Đà Nẵng',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicHeader />

      <div className={styles.container}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 28, marginBottom: 8 }}>
            {lang === 'en' ? 'Track Application Status' : 'Tra cứu tình trạng hồ sơ'}
          </h2>
          <p>
            {lang === 'en' 
              ? 'Enter Application Code (e.g. CDC-123456) or Citizen ID / Passport number to check processing progress'
              : 'Nhập mã hồ sơ (CDC-XXXXXX) hoặc số CCCD/Hộ chiếu để kiểm tra tiến độ xử lý'}
          </p>
        </div>

        {/* Search Box */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-body">
            <div className={styles.searchBox}>
              <input
                className="form-control"
                placeholder={lang === 'en' ? 'Enter Application Code (e.g. CDC-123456) or ID / Passport' : 'Nhập mã hồ sơ (VD: CDC-123456), số CCCD hoặc số Hộ chiếu'}
                value={query}
                onChange={e => { setQuery(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                style={{ fontSize: 16 }}
              />
              <button className="btn btn-primary" onClick={() => doSearch()} disabled={loading} style={{ flexShrink: 0 }}>
                {loading ? <span className="spinner" /> : <i className="fa-solid fa-magnifying-glass" />}
                {lang === 'en' ? 'Track' : 'Tra cứu'}
              </button>
            </div>
            {error && (
              <div className="alert alert-danger" style={{ marginTop: 14 }}>
                <i className="fa-solid fa-circle-exclamation" /> {error}
              </div>
            )}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="card">
            <div className="card-header">
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 3 }}>
                  {lang === 'en' ? 'Tracking Result' : 'Kết quả tra cứu'}
                </div>
                <h3 style={{ fontSize: 20, color: 'var(--primary)' }}>{result.application.id}</h3>
              </div>
              <span className={`badge badge-${result.application.status}`} style={{ fontSize: 13, padding: '6px 14px' }}>
                {STATUS_STEPS[currentIdx]?.label || result.application.status}
              </span>
            </div>

            <div className="card-body">
              {/* Info Grid */}
              <div className={styles.infoGrid}>
                {[
                  [lang === 'en' ? 'Applicant' : 'Người nộp', result.application.name],
                  [lang === 'en' ? 'Citizen ID' : 'Số CCCD / Định danh', result.application.cccd],
                  result.application.passport ? [lang === 'en' ? 'Passport' : 'Số Hộ chiếu', result.application.passport] : null,
                  [lang === 'en' ? 'Submitted At' : 'Thời gian nộp', new Date(result.application.submitted_at).toLocaleString('vi-VN')],
                  [lang === 'en' ? 'Delivery Method' : 'Hình thức nhận KQ', methodLabel[result.application.receive_method] || result.application.receive_method],
                  [lang === 'en' ? 'Service Fee' : 'Lệ phí cấp phiếu', '85.000 VNĐ (BIDV: 5611147422)'],
                  [lang === 'en' ? 'Payment Status' : 'Trạng thái thu phí', result.application.payment_confirmed ? (lang === 'en' ? '✓ Payment Verified' : '✓ Đã xác nhận thu tiền') : (lang === 'en' ? 'Awaiting Bank Verification' : 'Đang chờ đối chiếu biến động số dư')],
                  [lang === 'en' ? 'PCBTN Officer' : 'Cán bộ Khoa PCBTN', result.application.handler_name ? `✓ ${result.application.handler_name}` : (lang === 'en' ? 'Assigning...' : 'Đang phân công')],
                  [lang === 'en' ? 'E-Invoice Status' : 'Trạng thái HĐĐT', result.application.invoice_status === 'issued' ? (lang === 'en' ? `✓ Issued (${result.application.invoice_no || 'E-Invoice'})` : `✓ Đã phát hành (${result.application.invoice_no || 'HĐĐT'})`) : (lang === 'en' ? 'Pending Cashier Issuance' : 'Chờ kế toán xuất')],
                ].filter(Boolean).map(([label, value]) => (
                  <div key={label} className={styles.infoItem}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              {/* Tải về kết quả (Chứng nhận & Hóa đơn) */}
              {(result.application.certificate_url || result.application.invoice_url) && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20, margin: '24px 0' }}>
                  <h4 style={{ color: '#166534', fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-file-arrow-down" /> {lang === 'en' ? 'Your certificate and official documents are ready:' : 'Kết quả và chứng từ của bạn đã sẵn sàng:'}
                  </h4>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {result.application.certificate_url && (
                      <a href={result.application.certificate_url} target="_blank" rel="noreferrer" className="btn btn-success">
                        <i className="fa-solid fa-certificate" /> {lang === 'en' ? 'Download Vaccination Certificate (PDF Scan)' : 'Tải Giấy chứng nhận tiêm chủng (Bản scan)'}
                      </a>
                    )}
                    {result.application.invoice_url && (
                      <a href={result.application.invoice_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ color: '#166534', borderColor: '#166534' }}>
                        <i className="fa-solid fa-file-invoice-dollar" /> {lang === 'en' ? `Download E-Invoice (${result.application.invoice_no || 'Invoice'})` : `Tải Hóa đơn điện tử (${result.application.invoice_no || 'HĐĐT'})`}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <h4 style={{ fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-route" style={{ color: 'var(--text-muted)' }} />
                {lang === 'en' ? 'Application Processing Timeline' : 'Lộ trình xử lý hồ sơ'}
              </h4>

              <div className="timeline">
                {STATUS_STEPS.map((step, i) => {
                  const isDone = i < currentIdx;
                  const isActive = i === currentIdx;
                  const logEntry = result.statusLogs?.find(l => l.new_status === step.key);

                  return (
                    <div key={step.key} className={`timeline-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                      <div className="timeline-dot">
                        {isDone ? <i className="fa-solid fa-check" style={{ fontSize: 9 }} /> :
                         isActive ? <i className={`fa-solid ${step.icon}`} style={{ fontSize: 9 }} /> :
                         <span style={{ fontSize: 10 }}>{i + 1}</span>}
                      </div>
                      <div className="timeline-content">
                        <h4>{step.label}</h4>
                        <p>{step.desc}</p>
                        {logEntry && (
                          <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                            <i className="fa-regular fa-clock" /> {new Date(logEntry.changed_at).toLocaleString('vi-VN')}
                            {logEntry.note && ` — ${logEntry.note}`}
                          </p>
                        )}
                        {isActive && (
                          <span className={`badge badge-${step.key}`} style={{ marginTop: 6 }}>
                            {lang === 'en' ? 'Currently at this step' : 'Đang ở bước này'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Completed message */}
              {result.application.status === 'completed' && (
                <div className="alert alert-success" style={{ marginTop: 24 }}>
                  <i className="fa-solid fa-circle-check" />
                  <div>
                    <strong>{lang === 'en' ? 'Application Completed!' : 'Hồ sơ đã hoàn tất!'}</strong>
                    <p style={{ margin: '4px 0 0', color: 'inherit' }}>
                      {result.application.receive_method === 'email' && (lang === 'en' ? 'Official certificate and electronic invoice have been emailed to your address.' : 'Giấy chứng nhận và hóa đơn đã được gửi qua email của bạn.')}
                      {result.application.receive_method === 'postal' && (lang === 'en' ? 'Original certificate is being delivered by postal courier to your residential address.' : 'Giấy chứng nhận đang được gửi qua bưu điện đến địa chỉ của bạn.')}
                      {result.application.receive_method === 'direct' && (lang === 'en' ? 'Please pick up your certificate in person at Danang CDC One-Stop Service Desk (118 Le Dinh Ly).' : 'Vui lòng đến nhận trực tiếp tại Bộ phận Một cửa — CDC Đà Nẵng (118 Lê Đình Lý).')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="pub-footer" style={{ marginTop: 'auto' }}>
        <p><strong>CDC Đà Nẵng</strong> — 118 Lê Đình Lý, Thanh Khê, Đà Nẵng. Hotline: <strong>0236 382 2779</strong></p>
      </footer>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><span className="spinner spinner-dark" style={{ width: 36, height: 36 }} /></div>}>
      <TrackContent />
    </Suspense>
  );
}
