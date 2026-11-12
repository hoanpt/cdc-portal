'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../admin.module.css';

const STATUS_OPTS = [
  { value: 'pending',    label: 'Chờ thu phí & xác nhận', cls: 'badge-pending' },
  { value: 'processing', label: 'Đang xử lý (Khoa PCBTN)', cls: 'badge-processing' },
  { value: 'completed',  label: 'Đã hoàn tất & Trả KH',    cls: 'badge-completed' },
];

const PCBTN_OFFICERS = [
  'Nguyễn Thị Yến',
  'Đoàn Cẩm Trúc',
  'Đặng Thị Mai Khôi',
  'Nguyễn Thị Kiều Diểm'
];

const METHOD_MAP = { email: 'Qua Email', postal: 'Bưu điện', direct: 'Nhận trực tiếp tại CDC' };

export default function CaseDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updating, setUpdating] = useState(false);

  // Kế toán state
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceIssuer, setInvoiceIssuer] = useState('Lê Thị Mỹ Phượng');
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Khoa PCBTN state
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [certFile, setCertFile] = useState(null);
  const [certNotes, setCertNotes] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [showIssuer, setShowIssuer] = useState(false);

  useEffect(() => {
    loadApp();
  }, [id]);

  async function loadApp() {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${id}`);
      if (res.status === 401) { router.push('/admin'); return; }
      if (!res.ok) { setError('Không tìm thấy hồ sơ'); setLoading(false); return; }
      const data = await res.json();
      setApp(data);
      setNewStatus(data.status);
      setSelectedOfficer(data.handler_name || '');
      setInvoiceNo(data.invoice_no || '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Kế toán: Xác nhận thu tiền & Xuất HĐĐT chuyển Khoa PCBTN
  async function confirmPaymentAndTransfer() {
    if (!invoiceNo.trim() && !invoiceFile) {
      if (!confirm('Bạn chưa nhập Số HĐĐT hoặc chưa đính kèm file HĐĐT. Bạn có chắc chắn muốn xác nhận thu tiền và chuyển qua Khoa PCBTN không?')) {
        return;
      }
    }

    setSavingInvoice(true);
    try {
      const fd = new FormData();
      if (invoiceFile) fd.append('file_invoice', invoiceFile);
      fd.append('invoice_no', invoiceNo);
      fd.append('notes', invoiceNotes);
      fd.append('issuer_name', invoiceIssuer);

      const res = await fetch(`/api/applications/${id}/invoice`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('✅ Đã xác nhận thu tiền, đính kèm HĐĐT và chuyển hồ sơ qua Khoa PCBTN thành công!');
      setInvoiceFile(null);
      setInvoiceNotes('');
      loadApp();
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setSavingInvoice(false);
    }
  }

  // Khoa PCBTN: Phân công cán bộ
  async function assignOfficer(officer) {
    setSelectedOfficer(officer);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handler_name: officer })
      });
      if (res.ok) {
        loadApp();
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Khoa PCBTN: Đính kèm Giấy chứng nhận và hoàn tất trả hồ sơ cho KH
  async function completeAndReturnToCustomer() {
    if (!certFile && (!app.certificate_json || !app.certificate_json.url)) {
      alert('Vui lòng chọn file bản scan Giấy chứng nhận (PDF/JPG/PNG) trước khi gửi trả cho khách hàng');
      return;
    }

    if (!selectedOfficer) {
      alert('Vui lòng chọn tên Cán bộ Khoa PCBTN tiếp nhận & xử lý');
      return;
    }

    setUploadingCert(true);
    try {
      const fd = new FormData();
      if (certFile) fd.append('file_certificate', certFile);
      fd.append('notes', certNotes);
      fd.append('handler_name', selectedOfficer);

      const res = await fetch(`/api/applications/${id}/certificate`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const emailMsg = data.emailSent 
        ? '\n📧 Đã gửi email kèm Giấy chứng nhận và Hóa đơn điện tử cho khách hàng.' 
        : '\n⚠️ Hệ thống SMTP chưa bật, khách hàng có thể tra cứu và tải trực tiếp trên cổng.';

      alert('✅ Đã hoàn tất và gửi kết quả hồ sơ thành công!' + emailMsg);
      setShowIssuer(false);
      setCertFile(null);
      setCertNotes('');
      loadApp();
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setUploadingCert(false);
    }
  }

  // Cập nhật trạng thái thủ công
  async function updateStatus() {
    setUpdating(true);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes: statusNote, handler_name: selectedOfficer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('✅ Đã cập nhật trạng thái hồ sơ thành công!');
      loadApp();
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setUpdating(false);
      setStatusNote('');
    }
  }

  if (loading) return (
    <div className={styles.adminLayout}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <span className="spinner spinner-dark" style={{ width: 40, height: 40 }} />
      </div>
    </div>
  );

  if (error) return (
    <div className={styles.adminLayout}>
      <div style={{ textAlign: 'center', padding: 80 }}>
        <p style={{ color: 'var(--danger)', fontSize: 18 }}>{error}</p>
        <Link href="/admin/dashboard" className="btn btn-primary" style={{ marginTop: 20 }}>← Quay lại</Link>
      </div>
    </div>
  );

  const statusInfo = STATUS_OPTS.find(s => s.value === app.status) || { label: app.status, cls: 'badge-pending' };

  return (
    <div className={styles.adminLayout}>
      <nav className={styles.adminNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/dashboard" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-arrow-left" />
          </Link>
          <span style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>
            Chi tiết Hồ sơ — <span style={{ color: '#60a5fa' }}>{app.id}</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className={`badge ${statusInfo.cls}`} style={{ fontSize: 13, padding: '6px 14px' }}>
            {statusInfo.label}
          </span>
        </div>
      </nav>

      <div className={styles.adminContent} style={{ maxWidth: 960 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          
          {/* KHỐI 1: Thông tin người nộp hồ sơ */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <h3><i className="fa-solid fa-user" style={{ color: 'var(--primary)', marginRight: 10 }} />Thông tin người nộp hồ sơ</h3>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                <i className="fa-regular fa-clock" /> Nộp lúc: {new Date(app.submitted_at).toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Họ và tên</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>{app.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Số CCCD / Hộ chiếu</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{app.cccd}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Số điện thoại</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{app.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Email liên hệ</div>
                  <div style={{ fontSize: 14 }}>{app.email || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Ngày sinh</div>
                  <div style={{ fontSize: 14 }}>{app.dob ? new Date(app.dob).toLocaleDateString('vi-VN') : '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Giới tính</div>
                  <div style={{ fontSize: 14 }}>{app.gender || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Hình thức nhận KQ</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{METHOD_MAP[app.receive_method] || app.receive_method}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Cán bộ Khoa PCBTN</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: app.handler_name ? '#047857' : '#b45309' }}>
                    {app.handler_name ? `✓ ${app.handler_name}` : 'Chưa phân công'}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Địa chỉ liên hệ</div>
                  <div style={{ fontSize: 14 }}>{app.address || '—'}</div>
                </div>
                {app.notes && (
                  <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: 10, borderRadius: 6, fontSize: 13 }}>
                    <strong>Ghi chú của người dân:</strong> {app.notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KHỐI 2: Thông tin Thanh toán & Hóa đơn điện tử */}
          <div className="card" style={{ gridColumn: '1 / -1', borderLeft: '4px solid #10b981' }}>
            <div className="card-header" style={{ background: '#f0fdf4' }}>
              <h3 style={{ color: '#047857' }}>
                <i className="fa-solid fa-receipt" style={{ marginRight: 8 }} />
                Thông tin Thanh toán &amp; Xuất Hóa đơn điện tử
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className={`badge ${app.payment_confirmed ? 'badge-completed' : 'badge-pending'}`}>
                  {app.payment_confirmed ? '✓ Đã xác nhận thu 85.000 VNĐ' : 'Chờ xác nhận tiền'}
                </span>
                <span className={`badge ${app.invoice_status === 'issued' ? 'badge-completed' : 'badge-pending'}`}>
                  {app.invoice_status === 'issued' ? `✓ Đã xuất HĐĐT${app.invoice_no ? `: ${app.invoice_no}` : ''}` : 'Chưa xuất HĐĐT'}
                </span>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, fontSize: 13.5 }}>
                <div>• Lệ phí: <strong>85.000 VNĐ</strong> (BIDV: <strong>5611147422</strong>)</div>
                <div>• Loại hóa đơn: <strong>{app.invoice_type === 'company' ? 'Doanh nghiệp / Tổ chức' : 'Cá nhân'}</strong></div>
                <div>• Email nhận HĐĐT: <strong style={{ color: 'var(--primary)' }}>{app.invoice_email || app.email || '—'}</strong></div>
                
                {app.invoice_type === 'company' && (
                  <>
                    <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '10px 14px', borderRadius: 8 }}>
                      <div>• Tên cơ quan, tổ chức: <strong>{app.invoice_company_name}</strong></div>
                      <div>• Mã số thuế: <strong style={{ color: 'var(--danger)' }}>{app.invoice_tax_code}</strong> {app.invoice_budget_code ? ` | Mã QHNS: ${app.invoice_budget_code}` : ''}</div>
                      <div>• Địa chỉ xuất HĐ: <strong>{app.invoice_address}</strong></div>
                    </div>
                  </>
                )}

                {app.invoice_status === 'issued' && (
                  <div style={{ gridColumn: '1 / -1', background: '#ecfdf5', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ color: '#047857', fontWeight: 600 }}>✓ Hóa đơn điện tử đã phát hành: </span>
                      <strong>{app.invoice_no || 'Đã xuất'}</strong> — Người xuất: <strong>{app.invoice_issued_by || 'Lê Thị Mỹ Phượng'}</strong>
                    </div>
                    {app.invoice_file_url && (
                      <a href={app.invoice_file_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-success">
                        <i className="fa-solid fa-eye" /> Xem / Tải file HĐĐT
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* QUY TRÌNH BƯỚC 1: KẾ TOÁN THU PHÍ (Lê Thị Mỹ Phượng) */}
          <div className="card" style={{ border: '2px solid #3b82f6' }}>
            <div className="card-header" style={{ background: '#eff6ff' }}>
              <h3 style={{ color: '#1d4ed8' }}>
                <i className="fa-solid fa-cash-register" style={{ marginRight: 8 }} />
                Bước 1: Kế toán thu phí &amp; Xuất HĐĐT
              </h3>
              <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>Cán bộ: Lê Thị Mỹ Phượng</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Kế toán kiểm tra tiền tài khoản BIDV <strong>5611147422</strong>. Sau khi có tiền, xuất HĐĐT, đính kèm file vào đây và bấm nút bên dưới để chuyển tiếp qua Khoa PCBTN.
              </p>

              <div className="form-group">
                <label className="form-label">Số Hóa đơn điện tử (nếu có)</label>
                <input 
                  className="form-control" 
                  placeholder="Ví dụ: 0012345" 
                  value={invoiceNo} 
                  onChange={e => setInvoiceNo(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Đính kèm File Hóa đơn điện tử (PDF/Ảnh) <span className="required">*</span></label>
                <input 
                  className="form-control" 
                  type="file" 
                  accept="application/pdf,image/*" 
                  onChange={e => setInvoiceFile(e.target.files[0])} 
                />
                {app.invoice_file_url && !invoiceFile && (
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--success)' }}>
                    ✓ Đã có file HĐĐT trên hệ thống. Chọn file mới nếu muốn thay thế.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú kế toán</label>
                <input 
                  className="form-control" 
                  placeholder="Ghi chú thêm về giao dịch chuyển khoản..." 
                  value={invoiceNotes} 
                  onChange={e => setInvoiceNotes(e.target.value)} 
                />
              </div>

              <button 
                className="btn btn-primary" 
                onClick={confirmPaymentAndTransfer} 
                disabled={savingInvoice}
                style={{ background: '#2563eb' }}
              >
                {savingInvoice ? <><span className="spinner" /> Đang lưu...</> : (
                  <><i className="fa-solid fa-arrow-right" /> Xác nhận có tiền, đính kèm HĐĐT &amp; Chuyển Khoa PCBTN</>
                )}
              </button>
            </div>
          </div>

          {/* QUY TRÌNH BƯỚC 2: KHOA PCBTN (Cấp giấy chứng nhận) */}
          <div className="card" style={{ border: '2px solid #10b981' }}>
            <div className="card-header" style={{ background: '#ecfdf5' }}>
              <h3 style={{ color: '#047857' }}>
                <i className="fa-solid fa-certificate" style={{ marginRight: 8 }} />
                Bước 2: Khoa PCBTN xử lý &amp; Trả kết quả
              </h3>
              <span style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>Khoa PCBTN</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Cán bộ Khoa PCBTN đối chiếu lịch sử tiêm, đính kèm Giấy chứng nhận bản scan và gửi trả cho khách hàng (kèm cả Hóa đơn điện tử).
              </p>

              <div className="form-group">
                <label className="form-label">Cán bộ Khoa PCBTN tiếp nhận &amp; xử lý <span className="required">*</span></label>
                <select 
                  className="form-control" 
                  value={selectedOfficer} 
                  onChange={e => assignOfficer(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  <option value="">— Chọn cán bộ phụ trách —</option>
                  {PCBTN_OFFICERS.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Chọn File Giấy chứng nhận bản scan (PDF/Ảnh) <span className="required">*</span></label>
                <input 
                  className="form-control" 
                  type="file" 
                  accept="application/pdf,image/*" 
                  onChange={e => setCertFile(e.target.files[0])} 
                />
                {app.certificate_json?.url && !certFile && (
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--success)' }}>
                    ✓ Đã có Giấy chứng nhận trên hệ thống ({app.certificate_id}). Chọn file mới nếu muốn cập nhật.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú gửi kèm cho khách hàng</label>
                <input 
                  className="form-control" 
                  placeholder="Ví dụ: Giấy chứng nhận đã được cấp hợp lệ..." 
                  value={certNotes} 
                  onChange={e => setCertNotes(e.target.value)} 
                />
              </div>

              <button 
                className="btn btn-success" 
                onClick={completeAndReturnToCustomer} 
                disabled={uploadingCert}
                style={{ background: '#059669' }}
              >
                {uploadingCert ? <><span className="spinner" /> Đang gửi kết quả...</> : (
                  <><i className="fa-solid fa-paper-plane" /> Hoàn tất &amp; Gửi trả kết quả cho Khách hàng</>
                )}
              </button>
            </div>
          </div>

          {/* File đính kèm từ khách hàng */}
          <div className="card">
            <div className="card-header">
              <h3><i className="fa-solid fa-paperclip" style={{ color: 'var(--primary)', marginRight: 8 }} />Tệp đính kèm từ khách hàng</h3>
            </div>
            <div className="card-body">
              {(app.files_json && app.files_json.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {app.files_json.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <i className="fa-solid fa-file" style={{ color: 'var(--primary)', fontSize: 18 }} />
                      <span style={{ flex: 1, fontSize: 13 }}>
                        <strong>{f.label === 'BienLaiThanhToan' ? 'Biên lai chuyển khoản BIDV' : f.label === 'SoTiemChung' ? 'Sổ tiêm chủng' : f.label}:</strong> {f.originalName}
                      </span>
                      <a href={f.localPath} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                        <i className="fa-solid fa-eye" /> Xem file
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-warning">Không có file đính kèm nào.</div>
              )}
            </div>
          </div>

          {/* Lịch sử xử lý */}
          <div className="card">
            <div className="card-header">
              <h3><i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--primary)', marginRight: 8 }} />Lịch sử xử lý hồ sơ</h3>
            </div>
            <div className="card-body">
              {(app.statusLogs || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Chưa có lịch sử.</p>
              ) : (
                <div className="timeline">
                  {[...app.statusLogs].reverse().map((log, i) => (
                    <div key={i} className="timeline-item done">
                      <div className="timeline-dot"><i className="fa-solid fa-check" style={{ fontSize: 8 }} /></div>
                      <div className="timeline-content">
                        <h4>{STATUS_OPTS.find(s => s.value === log.new_status)?.label || log.new_status}</h4>
                        <p style={{ fontSize: 12 }}>
                          {log.changed_by !== 'system' && <strong>{log.changed_by} — </strong>}
                          {new Date(log.changed_at).toLocaleString('vi-VN')}
                          {log.note && <em> — "{log.note}"</em>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
