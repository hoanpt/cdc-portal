'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css';

const STATUS_MAP = {
  pending:    { text: 'Chờ tiếp nhận', cls: 'badge-pending' },
  received:   { text: 'Đã tiếp nhận',  cls: 'badge-received' },
  processing: { text: 'Đang xử lý',    cls: 'badge-processing' },
  completed:  { text: 'Đã hoàn tất',   cls: 'badge-completed' },
};

const METHOD_MAP = {
  email:  'Qua Email',
  postal: 'Bưu điện',
  direct: 'Nhận trực tiếp',
};

const PCBTN_OFFICERS = [
  'Nguyễn Thị Yến',
  'Đoàn Cẩm Trúc',
  'Đặng Thị Mai Khôi',
  'Nguyễn Thị Kiều Diểm'
];

function DoughnutChart({ stats }) {
  if (!stats || !stats.byStatus) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-muted)', fontSize: 13 }}>
        <i className="fa-solid fa-chart-pie" style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }} />
        Chưa có dữ liệu thống kê
      </div>
    );
  }
  const pending    = stats.byStatus.pending    || 0;
  const received   = stats.byStatus.received   || 0;
  const processing = stats.byStatus.processing || 0;
  const completed  = stats.byStatus.completed  || 0;
  const total = pending + received + processing + completed;
  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-muted)', fontSize: 13 }}>
        <i className="fa-solid fa-chart-pie" style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }} />
        Chưa có hồ sơ trong kỳ này
      </div>
    );
  }
  const items = [
    { label: 'Chờ tiếp nhận', count: pending,    color: '#f59e0b', pct: stats.pendingRatio    || 0 },
    { label: 'Đã tiếp nhận',  count: received,   color: '#3b82f6', pct: stats.receivedRatio   || 0 },
    { label: 'Đang xử lý',    count: processing, color: '#8b5cf6', pct: stats.processingRatio || 0 },
    { label: 'Đã hoàn tất',   count: completed,  color: '#10b981', pct: stats.completedRatio  || 0 },
  ];
  const size = 150, sw = 22;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  const segs = items.map(item => {
    const da  = `${(item.pct / 100) * circ} ${circ}`;
    const do_ = -((acc / 100) * circ);
    acc += item.pct;
    return { ...item, da, do_ };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '10px 0', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
          {segs.map((s, i) => (
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.color} strokeWidth={sw}
              strokeDasharray={s.da} strokeDashoffset={s.do_} strokeLinecap="butt"
              style={{ transition: 'all 0.5s ease' }} />
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)' }}>{total}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Hồ sơ</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 100, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--gray-700)' }}>{item.label}</span>
            <strong>{item.count}</strong>
            <span style={{ color: 'var(--text-muted)' }}>({item.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ stats }) {
  const days = (stats && Array.isArray(stats.last7Days)) ? stats.last7Days : [];
  if (days.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-muted)', fontSize: 13 }}>
        <i className="fa-solid fa-chart-column" style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }} />
        Chưa có dữ liệu 7 ngày qua
      </div>
    );
  }
  const maxCount = Math.max(...days.map(d => d?.count || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, gap: 8, padding: '10px 8px 0' }}>
      {days.map((d, i) => {
        const count = d?.count || 0;
        const dt = d?.day ? new Date(d.day) : new Date();
        const label = `${dt.getDate()}/${dt.getMonth() + 1}`;
        const h = Math.max(Math.round((count / maxCount) * 100), 6);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: count > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>{count}</span>
            <div style={{ width: '100%', maxWidth: 36, height: `${h}%`, background: count > 0 ? 'linear-gradient(180deg,#3b82f6,#1d4ed8)' : '#e2e8f0', borderRadius: '6px 6px 0 0', transition: 'height 0.4s' }} />
            <span style={{ fontSize: 10, color: 'var(--gray-600)', fontWeight: 500 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function numberToVietnameseWords(num) {
  if (!num || num === 0) return 'Không đồng';
  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];

  function readGroup(n) {
    let str = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) str += units[h] + ' trăm ';
    if (t > 1) {
      str += units[t] + ' mươi ';
      if (u === 1) str += 'mốt ';
      else if (u === 5) str += 'lăm ';
      else if (u > 0) str += units[u] + ' ';
    } else if (t === 1) {
      str += 'mười ';
      if (u === 5) str += 'lăm ';
      else if (u > 0) str += units[u] + ' ';
    } else if (t === 0 && h > 0 && u > 0) {
      str += 'lẻ ' + units[u] + ' ';
    } else if (u > 0) {
      str += units[u] + ' ';
    }
    return str.trim();
  }

  let temp = Math.abs(num);
  let groups = [];
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let words = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const gStr = readGroup(g);
      words.push(gStr + (scales[i] ? ' ' + scales[i] : ''));
    }
  }

  const result = words.join(' ').trim();
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn';
}

export default function DashboardPage() {
  const [user, setUser]               = useState(null);
  const [stats, setStats]             = useState(null);
  const [apps, setApps]               = useState([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [period, setPeriod]           = useState('week');
  const [comparePeriod, setComparePeriod] = useState('none');
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [handlerFilter, setHandlerFilter] = useState('all');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [backing, setBacking]         = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting]       = useState(false);
  const [downloadingZipId, setDownloadingZipId] = useState(null);

  // Đổi mật khẩu modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Báo cáo Kế toán thu phí gửi Khoa PCBTN state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('week'); // 'week', 'month', 'year', 'custom', 'all'
  const [reportWeekType, setReportWeekType] = useState('current'); // 'current', 'previous'
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportCustomStart, setReportCustomStart] = useState('');
  const [reportCustomEnd, setReportCustomEnd] = useState('');
  const [reportPaymentFilter, setReportPaymentFilter] = useState('confirmed');
  const [reportInvoiceFilter, setReportInvoiceFilter] = useState('all');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const p = new URLSearchParams({
        period: reportPeriod,
        weekType: reportWeekType,
        year: String(reportYear),
        month: String(reportMonth),
        paymentFilter: reportPaymentFilter,
        invoiceFilter: reportInvoiceFilter,
      });
      if (reportCustomStart) p.set('startDate', reportCustomStart);
      if (reportCustomEnd) p.set('endDate', reportCustomEnd);

      const res = await fetch(`/api/reports/cashier?${p}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error('[fetchReport error]', e);
    } finally {
      setReportLoading(false);
    }
  }, [reportPeriod, reportWeekType, reportYear, reportMonth, reportCustomStart, reportCustomEnd, reportPaymentFilter, reportInvoiceFilter]);

  useEffect(() => {
    if (showReportModal) {
      fetchReport();
    }
  }, [showReportModal, fetchReport]);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (!pwForm.currentPassword) { setPwError('Vui lòng nhập mật khẩu hiện tại'); return; }
    if (!pwForm.newPassword || pwForm.newPassword.length < 6) { setPwError('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Mật khẩu xác nhận không trùng khớp'); return; }

    setPwSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPwSuccess('✅ Đổi mật khẩu thành công!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPwSuccess('');
      }, 1500);
    } catch(err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => {
        if (r.status === 401) { window.location.href = '/admin'; return null; }
        return r.ok ? r.json() : null;
      })
      .then(data => { if (data && data.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?period=${period}&comparePeriod=${comparePeriod}`);
      if (res.status === 401) { window.location.href = '/admin'; return; }
      if (!res.ok) return;
      const data = await res.json();
      if (data && !data.error) setStats(data);
    } catch (e) { console.error('[fetchStats]', e); }
  }, [period, comparePeriod]);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (handlerFilter !== 'all') params.set('handler', handlerFilter);
      if (invoiceFilter !== 'all') params.set('invoice_status', invoiceFilter);
      if (search) params.set('q', search);
      const res = await fetch(`/api/applications?${params}`);
      if (res.status === 401) { window.location.href = '/admin'; return; }
      if (!res.ok) { setApps([]); setTotal(0); return; }
      const data = await res.json();
      setApps(Array.isArray(data.data) ? data.data : []);
      setTotal(parseInt(data.total ?? 0, 10) || 0);
    } catch (e) { console.error('[fetchApps]', e); setApps([]); }
    finally { setLoading(false); }
  }, [statusFilter, handlerFilter, invoiceFilter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchApps();  }, [fetchApps]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin';
  }

  async function doBackup() {
    setBacking(true);
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Backup thành công! File: ' + data.filename + ' (' + (data.size/1024).toFixed(1) + ' KB)');
      } else { alert('Backup thất bại: ' + data.error); }
    } catch (e) { alert('Lỗi: ' + e.message); }
    finally { setBacking(false); }
  }

  async function handleDownloadZip(appId, appName) {
    setDownloadingZipId(appId);
    try {
      const res = await fetch(`/api/applications/${appId}/download-all`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert('Không thể tải file ZIP (Mã HS: ' + appId + '):\n' + (data.error || 'File không tồn tại.'));
        return;
      }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = appId + '_' + (appName || 'HoSo').replace(/[^a-zA-Z0-9_-]/g, '_') + '_TatCaFile.zip';
      document.body.appendChild(a);
      a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { alert('Lỗi tải file: ' + e.message); }
    finally { setDownloadingZipId(null); }
  }

  async function handleDeleteSingle(id, name) {
    if (!confirm('Xóa hồ sơ ' + id + ' (' + name + ')?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { alert('Lỗi xóa: ' + (data.error || 'Không thể xóa')); return; }
      alert('Đã xóa hồ sơ thành công!');
      setSelectedIds(prev => prev.filter(i => i !== id));
      fetchApps(); fetchStats();
    } catch (e) { alert('Lỗi: ' + e.message); }
    finally { setDeleting(false); }
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm('XÁC NHẬN XÓA ' + selectedIds.length + ' hồ sơ đã chọn? Thao tác này KHÔNG THỂ HOÀN TÁC!')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/applications/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) { alert('Lỗi xóa: ' + (data.error || 'Có lỗi xảy ra')); return; }
      alert(data.message || 'Đã xóa các hồ sơ được chọn');
      setSelectedIds([]); fetchApps(); fetchStats();
    } catch (e) { alert('Lỗi kết nối: ' + e.message); }
    finally { setDeleting(false); }
  }

  function exportCSV() {
    const headers = [
      'Mã hồ sơ', 'Họ và tên', 'CCCD/Hộ chiếu', 'Số điện thoại', 'Email liên hệ', 'Địa chỉ',
      'Thời gian nộp', 'Hình thức nhận KQ', 'Lệ phí (VNĐ)', 'Thanh toán BIDV', 'Thời gian xác nhận tiền',
      'Người xác nhận tiền', 'Yêu cầu HĐĐT', 'Tên cơ quan/Công ty', 'Mã số thuế', 'Mã QHNS',
      'Địa chỉ HĐĐT', 'Email nhận HĐĐT', 'Tình trạng HĐĐT', 'Số hóa đơn', 'Cán bộ PCBTN tiếp nhận'
    ];
    const rows = filtered.map(a => [
      a.id || '',
      a.name || '',
      a.cccd || '',
      a.phone || '',
      a.email || '',
      a.address || '',
      a.submitted_at ? new Date(a.submitted_at).toLocaleString('vi-VN') : '',
      METHOD_MAP[a.receive_method] || a.receive_method || '',
      '85,000',
      a.payment_confirmed ? 'Đã thu tiền' : 'Chưa thu',
      a.payment_confirmed_at ? new Date(a.payment_confirmed_at).toLocaleString('vi-VN') : '',
      a.payment_confirmed_by || '',
      a.invoice_type === 'company' ? 'Doanh nghiệp' : 'Cá nhân',
      a.invoice_company_name || '',
      a.invoice_tax_code || '',
      a.invoice_budget_code || '',
      a.invoice_address || '',
      a.invoice_email || '',
      a.invoice_status === 'issued' ? 'Đã xuất HĐ' : 'Chưa xuất',
      a.invoice_no || '',
      a.handler_name || 'Chưa phân công'
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'DS_KeToan_Gui_PCBTN_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
  }

  function exportReportCSV() {
    if (!reportData || !reportData.records || reportData.records.length === 0) {
      alert('Không có dữ liệu hồ sơ nào trong kỳ báo cáo đã chọn.');
      return;
    }
    const headers = [
      'STT', 'Mã hồ sơ', 'Họ và tên', 'CCCD/Hộ chiếu', 'Số điện thoại', 'Email liên hệ', 'Địa chỉ',
      'Thời gian nộp', 'Lệ phí (VNĐ)', 'Thanh toán BIDV', 'Thời gian thu tiền', 'Người thu tiền',
      'Yêu cầu HĐĐT', 'Tên cơ quan/Công ty', 'Mã số thuế', 'Mã QHNS', 'Địa chỉ HĐĐT', 'Email nhận HĐĐT',
      'Tình trạng HĐĐT', 'Số hóa đơn', 'Cán bộ PCBTN tiếp nhận', 'Trạng thái hồ sơ'
    ];
    const rows = reportData.records.map((a, idx) => [
      idx + 1,
      a.id || '',
      a.name || '',
      a.cccd || '',
      a.phone || '',
      a.email || '',
      a.address || '',
      a.submitted_at ? new Date(a.submitted_at).toLocaleString('vi-VN') : '',
      '85,000',
      a.payment_confirmed ? 'Đã thu tiền' : 'Chưa thu',
      a.payment_confirmed_at ? new Date(a.payment_confirmed_at).toLocaleString('vi-VN') : '',
      a.payment_confirmed_by || (a.payment_confirmed ? 'Lê Thị Mỹ Phượng' : ''),
      a.invoice_type === 'company' ? 'Doanh nghiệp' : 'Cá nhân',
      a.invoice_company_name || '',
      a.invoice_tax_code || '',
      a.invoice_budget_code || '',
      a.invoice_address || '',
      a.invoice_email || '',
      a.invoice_status === 'issued' ? 'Đã xuất HĐ' : 'Chưa xuất',
      a.invoice_no || '',
      a.handler_name || 'Chưa phân công',
      STATUS_OPTS.find(s => s.value === a.status)?.label || a.status || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeLabel = (reportData.periodLabel || 'Bao_Cao').replace(/[^a-zA-Z0-9\-_]/g, '_');
    link.href = url;
    link.download = `BaoCao_ThuPhi_Gui_PCBTN_${safeLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    if (!reportData || !reportData.records) return;
    const records = reportData.records;
    const summary = reportData.summary || {};
    const totalFee = summary.totalFee || 0;
    const words = numberToVietnameseWords(totalFee);
    const now = new Date();

    const printWin = window.open('', '_blank', 'width=1100,height=800');
    if (!printWin) {
      alert('Vui lòng cho phép mở popup để in báo cáo.');
      return;
    }

    const rowsHtml = records.map((r, i) => `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td style="font-weight:600;">${r.id || ''}</td>
        <td><strong>${r.name || ''}</strong></td>
        <td>${r.cccd || ''}</td>
        <td>${r.phone || ''}</td>
        <td>${r.invoice_company_name ? `${r.invoice_company_name}<br><small>MST: ${r.invoice_tax_code || ''}</small>` : 'Cá nhân'}</td>
        <td>${r.invoice_email || r.email || ''}</td>
        <td style="text-align:right;font-weight:600;">85.000 đ</td>
        <td style="text-align:center;">${r.payment_confirmed ? `<span style="color:#047857;font-weight:600;">Đã thu</span><br><small>${r.payment_confirmed_at ? new Date(r.payment_confirmed_at).toLocaleDateString('vi-VN') : ''}</small>` : 'Chưa thu'}</td>
        <td style="text-align:center;">${r.invoice_no ? `<strong>${r.invoice_no}</strong>` : '—'}</td>
        <td>${r.handler_name || 'Chưa phân công'}</td>
      </tr>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Báo cáo Thu phí gửi Khoa PCBTN - ${reportData.periodLabel}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm 15mm; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .header-left, .header-right { text-align: center; }
          .header-left h4, .header-right h4 { margin: 0; font-size: 13px; font-weight: bold; }
          .header-left p, .header-right p { margin: 2px 0 0; font-size: 13px; }
          .line { width: 120px; height: 1px; background: #000; margin: 4px auto 0; }
          .title { text-align: center; margin: 25px 0 15px; }
          .title h2 { margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; }
          .title p { margin: 6px 0 0; font-style: italic; font-size: 14px; }
          .meta { margin-bottom: 15px; font-size: 13.5px; }
          .meta p { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
          th { background: #f0f0f0; text-align: center; font-weight: bold; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; text-align: center; page-break-inside: avoid; }
          .signatures h4 { margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; }
          .signatures p { margin: 2px 0 60px; font-style: italic; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h4>TRUNG TÂM KIỂM SOÁT BỆNH TẬT</h4>
            <h4>THÀNH PHỐ ĐÀ NẴNG</h4>
            <p><strong>BỘ PHẬN KẾ TOÁN THU PHÍ</strong></p>
            <div class="line"></div>
          </div>
          <div class="header-right">
            <h4>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
            <p><strong>Độc lập - Tự do - Hạnh phúc</strong></p>
            <div class="line"></div>
            <p style="margin-top: 8px; font-style: italic;">Đà Nẵng, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}</p>
          </div>
        </div>

        <div class="title">
          <h2>BÁO CÁO TỔNG HỢP DANH SÁCH THU PHÍ &amp; XUẤT HÓA ĐƠN ĐIỆN TỬ</h2>
          <p>Kính gửi: Khoa Phòng, chống bệnh truyền nhiễm (PCBTN) theo dõi</p>
        </div>

        <div class="meta">
          <p>• <strong>Kỳ báo cáo:</strong> ${reportData.periodLabel}</p>
          <p>• <strong>Tài khoản đơn vị:</strong> 5611147422 — BIDV Chi nhánh Đà Nẵng | Mức thu: <strong>85.000 VNĐ / hồ sơ</strong></p>
          <p>• <strong>Tổng số hồ sơ trong kỳ:</strong> ${summary.totalRecords || 0} hồ sơ | <strong>Đã thu tiền:</strong> ${summary.confirmedCount || 0} hồ sơ</p>
          <p>• <strong>Tổng số tiền đã thu:</strong> <strong>${(totalFee).toLocaleString('vi-VN')} VNĐ</strong> (Bằng chữ: <em>${words}</em>)</p>
          <p>• <strong>Hóa đơn điện tử:</strong> Đã xuất: <strong>${summary.issuedInvoiceCount || 0}</strong> HĐ | Đã bàn giao Khoa PCBTN: <strong>${summary.transferredCount || 0}</strong> hồ sơ</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:30px;">STT</th>
              <th style="width:70px;">Mã HS</th>
              <th>Họ và tên</th>
              <th>CCCD/Hộ chiếu</th>
              <th>Số điện thoại</th>
              <th>Cơ quan / MST</th>
              <th>Email nhận HĐ</th>
              <th style="width:75px;">Lệ phí</th>
              <th style="width:70px;">Thu phí</th>
              <th style="width:70px;">Số HĐĐT</th>
              <th>Cán bộ PCBTN</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <h4>NGƯỜI LẬP BIỂU</h4>
            <p>(Ký, ghi rõ họ tên)</p>
            <strong>Lê Thị Mỹ Phượng</strong>
          </div>
          <div>
            <h4>KHOA PCBTN TIẾP NHẬN</h4>
            <p>(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <h4>LÃNH ĐẠO PHÊ DUYỆT</h4>
            <p>(Ký, đóng dấu)</p>
          </div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 500);
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }
  function toggleSelectAll() {
    setSelectedIds(selectedIds.length === filtered.length && filtered.length > 0 ? [] : filtered.map(a => a.id));
  }

  const filtered = (apps || []).filter(a => {
    if (!a) return false;
    if (handlerFilter !== 'all' && a.handler_name !== handlerFilter) return false;
    if (invoiceFilter !== 'all' && a.invoice_status !== invoiceFilter) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      String(a.name  || '').toLowerCase().includes(q) ||
      String(a.cccd  || '').toLowerCase().includes(q) ||
      String(a.id    || '').toLowerCase().includes(q) ||
      String(a.phone || '').toLowerCase().includes(q) ||
      String(a.invoice_company_name || '').toLowerCase().includes(q) ||
      String(a.invoice_tax_code || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className={styles.adminLayout}>
      <nav className={styles.adminNav}>
        <div className={styles.adminNavLogo} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-shield-halved" style={{ color: '#60a5fa' }} />
          CDC Admin Portal
          <span style={{ fontSize: 11, background: '#1e3a8a', color: '#93c5fd', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>v2.1.0</span>
        </div>
        <div className={styles.adminNavUser}>
          {user?.role === 'admin' && (
            <>
              <Link href="/admin/settings" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                <i className="fa-solid fa-gear" /> Cấu hình
              </Link>
              <Link href="/admin/accounts" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                <i className="fa-solid fa-users" /> Tài khoản
              </Link>
            </>
          )}

          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => { setPwError(''); setPwSuccess(''); setShowPasswordModal(true); }} 
            style={{ color: '#93c5fd', fontSize: 13 }}
            title="Đổi mật khẩu tài khoản của bạn"
          >
            <i className="fa-solid fa-key" /> Đổi mật khẩu
          </button>

          {user && (
            <span style={{ fontSize: 13, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-circle-user" /> {user.fullName || user.username}
              <span style={{ fontSize: 11, background: user.role === 'accountant' ? '#047857' : user.role === 'admin' ? '#1e3a8a' : '#475569', color: 'white', padding: '1px 6px', borderRadius: 4 }}>
                {user.role === 'accountant' ? 'Thu phí' : user.role === 'admin' ? 'Admin' : 'Khoa PCBTN'}
              </span>
            </span>
          )}

          <button className="btn btn-ghost btn-sm" onClick={logout} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            <i className="fa-solid fa-right-from-bracket" /> Thoát
          </button>
        </div>
      </nav>

      <div className={styles.adminContent}>
        {/* Banner dành riêng cho Kế toán Thu phí */}
        {user?.role === 'accountant' && (
          <div style={{
            background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            color: 'white', borderRadius: 10, padding: '14px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', flexWrap: 'wrap', gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                <i className="fa-solid fa-receipt" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Kế toán thu phí (Lê Thị Mỹ Phượng) &rarr; Khoa PCBTN</div>
                <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                  Tổng hợp danh sách hồ sơ thu phí (85.000 VNĐ), xuất HĐĐT và xuất báo cáo gửi Khoa PCBTN theo dõi theo Tuần, Tháng, Năm.
                </div>
              </div>
            </div>
            <button 
              className="btn" 
              onClick={() => setShowReportModal(true)}
              style={{ background: 'white', color: '#065f46', fontWeight: 700, padding: '8px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
            >
              <i className="fa-solid fa-file-lines" /> Xuất Báo cáo gửi PCBTN
            </button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-chart-line" style={{ color: 'var(--primary)' }} />
              Báo cáo thống kê ({stats?.periodLabel || 'Tuần này'})
            </h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Tỷ lệ hồ sơ chờ tiếp nhận, đang xử lý &amp; đã hoàn tất</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', gap: 6 }}>
              <i className="fa-solid fa-calendar-days" style={{ color: 'var(--primary)', fontSize: 13 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>Thời gian:</span>
              <select style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', outline: 'none', cursor: 'pointer' }}
                value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="week">Tuần này</option>
                <option value="day">Hôm nay</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
                <option value="all">Tất cả</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', gap: 6 }}>
              <i className="fa-solid fa-code-compare" style={{ color: '#8b5cf6', fontSize: 13 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>So sánh:</span>
              <select style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', outline: 'none', cursor: 'pointer' }}
                value={comparePeriod} onChange={e => setComparePeriod(e.target.value)} disabled={period === 'all'}>
                <option value="none">Không so sánh</option>
                <option value="previous">So với kỳ trước ({stats?.compareLabel || '...'})</option>
              </select>
            </div>
            <button className="btn btn-outline btn-sm" onClick={doBackup} disabled={backing}>
              {backing ? <span className="spinner spinner-dark" style={{ width: 14, height: 14 }} /> : <i className="fa-solid fa-database" />}
              Backup DB
            </button>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={`${styles.statCard} ${styles.blue}`}>
            <div className={styles.label}><i className="fa-solid fa-folder-open" style={{ marginRight: 6 }} />Tổng hồ sơ ({stats?.periodLabel || 'Tuần này'})</div>
            <div className={styles.value}>{stats?.total ?? '...'}</div>
          </div>
          <div className={`${styles.statCard} ${styles.amber}`}>
            <div className={styles.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><i className="fa-solid fa-clock" style={{ marginRight: 6 }} />Chờ tiếp nhận</span>
              <span style={{ background: 'rgba(245,158,11,0.15)', color: '#b45309', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{stats?.pendingRatio ?? 0}%</span>
            </div>
            <div className={styles.value}>{stats?.byStatus?.pending ?? '...'}</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>Chiếm {stats?.pendingRatio ?? 0}% tổng hồ sơ</div>
          </div>
          <div className={`${styles.statCard} ${styles.purple}`}>
            <div className={styles.label}><i className="fa-solid fa-gears" style={{ marginRight: 6 }} />Đã tiếp nhận &amp; Đang xử lý</div>
            <div className={styles.value}>{(stats?.byStatus?.received || 0) + (stats?.byStatus?.processing || 0)}</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>Tiếp nhận: {stats?.byStatus?.received || 0} | Xử lý: {stats?.byStatus?.processing || 0}</div>
          </div>
          <div className={`${styles.statCard} ${styles.green}`}>
            <div className={styles.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />Đã xử lý xong</span>
              <span style={{ background: 'rgba(16,185,129,0.15)', color: '#047857', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{stats?.completedRatio ?? 0}%</span>
            </div>
            <div className={styles.value}>{stats?.resolved ?? '...'}</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>Tỷ lệ hoàn tất: {stats?.completedRatio ?? 0}%</div>
          </div>
        </div>

        <div className={styles.chartsPanel}>
          <div className={styles.chartsGrid}>
            <div className={styles.chartBox}>
              <div className={styles.chartTitle}>
                <i className="fa-solid fa-chart-pie" style={{ color: '#f59e0b', marginRight: 6 }} />
                Tỷ lệ trạng thái ({stats?.periodLabel || 'Tuần này'})
              </div>
              <DoughnutChart stats={stats} />
            </div>
            <div className={styles.chartBox}>
              <div className={styles.chartTitle}>
                <i className="fa-solid fa-chart-column" style={{ color: '#3b82f6', marginRight: 6 }} />
                Hồ sơ tiếp nhận 7 ngày gần nhất
              </div>
              <BarChart stats={stats} />
            </div>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.toolbarTitle}>
            <i className="fa-solid fa-folder-open" style={{ color: 'var(--primary)' }} />
            Danh sách hồ sơ <span style={{ font: 'normal 14px Inter', color: 'var(--text-muted)', marginLeft: 6 }}>({total})</span>
          </div>
          <div className={styles.toolbarActions}>
            <select className={styles.searchInput} style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ thu phí</option>
              <option value="processing">Khoa PCBTN xử lý</option>
              <option value="completed">Đã hoàn tất</option>
            </select>
            <select className={styles.searchInput} style={{ width: 150 }} value={handlerFilter} onChange={e => setHandlerFilter(e.target.value)}>
              <option value="all">Tất cả cán bộ PCBTN</option>
              {PCBTN_OFFICERS.map(off => (
                <option key={off} value={off}>{off}</option>
              ))}
            </select>
            <select className={styles.searchInput} style={{ width: 140 }} value={invoiceFilter} onChange={e => setInvoiceFilter(e.target.value)}>
              <option value="all">Tất cả HĐĐT</option>
              <option value="unissued">Chờ xuất HĐ</option>
              <option value="issued">Đã xuất HĐ</option>
            </select>
            <input className={styles.searchInput} placeholder="Tìm theo tên, CCCD, MST, mã HS..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-outline btn-sm" onClick={fetchApps}>
              <i className="fa-solid fa-rotate-right" /> Làm mới
            </button>
            <button 
              className="btn btn-sm" 
              onClick={() => { setShowReportModal(true); }} 
              style={{ background: '#059669', color: '#fff', border: '1px solid #047857', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}
              title="Báo cáo thu phí & xuất HĐĐT gửi Khoa PCBTN theo dõi (Tuần, Tháng, Năm)"
            >
              <i className="fa-solid fa-file-invoice-dollar" /> Báo cáo gửi PCBTN
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: '#1e40af' }}>
              <i className="fa-solid fa-square-check" style={{ fontSize: 18, color: '#2563eb' }} />
              Đã chọn <strong style={{ marginLeft: 4 }}>{selectedIds.length}</strong>&nbsp;/ {filtered.length} hồ sơ
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-sm" onClick={() => setSelectedIds([])} style={{ background: 'white', border: '1px solid var(--border)', color: 'var(--gray-700)' }}>Bỏ chọn</button>
              <button className="btn btn-sm btn-danger" onClick={handleBatchDelete} disabled={deleting} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                {deleting ? <span className="spinner" /> : <i className="fa-solid fa-trash-can" />}
                Xóa {selectedIds.length} hồ sơ
              </button>
            </div>
          </div>
        )}

        <div className={styles.tableWrap}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 42, textAlign: 'center' }}>
                  <input type="checkbox" checked={filtered.length > 0 && selectedIds.length === filtered.length} onChange={toggleSelectAll} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </th>
                <th>Mã Hồ Sơ</th>
                <th>Họ và Tên / CCCD</th>
                <th>Ngày Nộp</th>
                <th>Thu Phí &amp; HĐĐT</th>
                <th>Cán bộ PCBTN</th>
                <th>Nhận KQ</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-icon"><i className="fa-solid fa-inbox" /></div>
                    <h3>Không có hồ sơ nào</h3>
                    <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                  </div>
                </td></tr>
              ) : filtered.map(app => {
                const st = STATUS_MAP[app.status] || STATUS_MAP.pending;
                const isSelected = selectedIds.includes(app.id);
                return (
                  <tr key={app.id} style={{ background: isSelected ? '#f0f9ff' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(app.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{app.id || '-'}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{app.name || '-'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.cccd || '-'}</div>
                    </td>
                    <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleString('vi-VN') : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {app.payment_confirmed ? (
                          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                            <i className="fa-solid fa-check-circle" /> Đã thu 85.000đ
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#dc2626' }}>
                            <i className="fa-solid fa-clock" /> Chưa xác nhận
                          </span>
                        )}
                        {app.invoice_status === 'issued' ? (
                          <span style={{ fontSize: 11, color: '#0284c7' }}>
                            <i className="fa-solid fa-receipt" /> HĐ: {app.invoice_no || 'Đã xuất'}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>Chưa xuất HĐ</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {app.handler_name ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', background: '#eff6ff', padding: '2px 8px', borderRadius: 4 }}>
                          <i className="fa-solid fa-user-doctor" style={{ marginRight: 4 }} />
                          {app.handler_name}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>{METHOD_MAP[app.receive_method] || app.receive_method || '-'}</td>
                    <td><span className={`badge ${st.cls}`}>{st.text}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button onClick={() => handleDownloadZip(app.id, app.name)} disabled={downloadingZipId === app.id}
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {downloadingZipId === app.id
                            ? <span className="spinner spinner-dark" style={{ width: 12, height: 12 }} />
                            : <i className="fa-solid fa-file-zipper" style={{ color: 'var(--primary)' }} />}
                          Tải file
                        </button>
                        <Link href={`/admin/cases/${app.id}`} className="btn btn-primary btn-sm">
                          <i className="fa-solid fa-eye" /> Xử lý
                        </Link>
                        <button className="btn btn-outline btn-sm" onClick={() => handleDeleteSingle(app.id, app.name)}
                          style={{ color: '#ef4444', borderColor: '#fca5a5' }}>
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL BÁO CÁO THU PHÍ GỬI KHOA PCBTN */}
      {showReportModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16
        }}>
          <div style={{
            background: 'white', borderRadius: 12, maxWidth: 1040, width: '96%',
            maxHeight: '92vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 22px', background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fa-solid fa-file-invoice-dollar" style={{ fontSize: 22, color: '#6ee7b7' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>
                    Báo cáo Kế toán thu phí gửi Khoa PCBTN
                  </h3>
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                    Tổng hợp danh sách hồ sơ thu phí (85.000 VNĐ), xuất HĐĐT để bàn giao Khoa PCBTN theo dõi
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowReportModal(false)} 
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', width: 32, height: 32, borderRadius: '50%', color: 'white', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Filter Controls */}
            <div style={{ padding: '14px 22px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Chọn kỳ báo cáo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    <i className="fa-regular fa-calendar-check" style={{ color: '#047857', marginRight: 5 }} />
                    Thời gian:
                  </span>
                  
                  {/* Period type selector */}
                  <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: 6, padding: 2 }}>
                    <button 
                      type="button" 
                      onClick={() => setReportPeriod('week')} 
                      style={{
                        border: 'none', padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: reportPeriod === 'week' ? '#047857' : 'transparent',
                        color: reportPeriod === 'week' ? 'white' : '#475569'
                      }}
                    >
                      Tuần
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setReportPeriod('month')} 
                      style={{
                        border: 'none', padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: reportPeriod === 'month' ? '#047857' : 'transparent',
                        color: reportPeriod === 'month' ? 'white' : '#475569'
                      }}
                    >
                      Tháng
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setReportPeriod('year')} 
                      style={{
                        border: 'none', padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: reportPeriod === 'year' ? '#047857' : 'transparent',
                        color: reportPeriod === 'year' ? 'white' : '#475569'
                      }}
                    >
                      Năm
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setReportPeriod('custom')} 
                      style={{
                        border: 'none', padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: reportPeriod === 'custom' ? '#047857' : 'transparent',
                        color: reportPeriod === 'custom' ? 'white' : '#475569'
                      }}
                    >
                      Tùy chọn ngày
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setReportPeriod('all')} 
                      style={{
                        border: 'none', padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: reportPeriod === 'all' ? '#047857' : 'transparent',
                        color: reportPeriod === 'all' ? 'white' : '#475569'
                      }}
                    >
                      Tất cả
                    </button>
                  </div>

                  {/* Sub-selectors */}
                  {reportPeriod === 'week' && (
                    <select 
                      className="form-control" 
                      style={{ width: 'auto', padding: '4px 10px', fontSize: 13, height: 32 }}
                      value={reportWeekType} 
                      onChange={e => setReportWeekType(e.target.value)}
                    >
                      <option value="current">Tuần này</option>
                      <option value="previous">Tuần trước</option>
                    </select>
                  )}

                  {reportPeriod === 'month' && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select 
                        className="form-control" 
                        style={{ width: 'auto', padding: '4px 8px', fontSize: 13, height: 32 }}
                        value={reportMonth} 
                        onChange={e => setReportMonth(parseInt(e.target.value, 10))}
                      >
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                          <option key={m} value={m}>Tháng {m}</option>
                        ))}
                      </select>
                      <select 
                        className="form-control" 
                        style={{ width: 'auto', padding: '4px 8px', fontSize: 13, height: 32 }}
                        value={reportYear} 
                        onChange={e => setReportYear(parseInt(e.target.value, 10))}
                      >
                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                          <option key={y} value={y}>Năm {y}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {reportPeriod === 'year' && (
                    <select 
                      className="form-control" 
                      style={{ width: 'auto', padding: '4px 10px', fontSize: 13, height: 32 }}
                      value={reportYear} 
                      onChange={e => setReportYear(parseInt(e.target.value, 10))}
                    >
                      {[2024, 2025, 2026, 2027, 2028].map(y => (
                        <option key={y} value={y}>Năm {y}</option>
                      ))}
                    </select>
                  )}

                  {reportPeriod === 'custom' && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input 
                        type="date" 
                        className="form-control" 
                        style={{ width: 135, height: 32, fontSize: 12, padding: '2px 8px' }}
                        value={reportCustomStart} 
                        onChange={e => setReportCustomStart(e.target.value)} 
                        placeholder="Từ ngày"
                      />
                      <span style={{ fontSize: 12, color: '#64748b' }}>đến</span>
                      <input 
                        type="date" 
                        className="form-control" 
                        style={{ width: 135, height: 32, fontSize: 12, padding: '2px 8px' }}
                        value={reportCustomEnd} 
                        onChange={e => setReportCustomEnd(e.target.value)} 
                        placeholder="Đến ngày"
                      />
                    </div>
                  )}
                </div>

                {/* Filter đối tượng */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select 
                    className="form-control" 
                    style={{ width: 'auto', height: 32, fontSize: 12, padding: '2px 8px' }}
                    value={reportPaymentFilter} 
                    onChange={e => setReportPaymentFilter(e.target.value)}
                  >
                    <option value="confirmed">Chỉ hồ sơ ĐÃ THU TIỀN</option>
                    <option value="all">Tất cả (Đã thu &amp; Chưa thu)</option>
                    <option value="unconfirmed">Chỉ hồ sơ CHƯA THU TIỀN</option>
                  </select>

                  <select 
                    className="form-control" 
                    style={{ width: 'auto', height: 32, fontSize: 12, padding: '2px 8px' }}
                    value={reportInvoiceFilter} 
                    onChange={e => setReportInvoiceFilter(e.target.value)}
                  >
                    <option value="all">Tất cả tình trạng HĐĐT</option>
                    <option value="issued">Đã xuất HĐĐT</option>
                    <option value="unissued">Chờ xuất HĐĐT</option>
                  </select>

                  <button 
                    className="btn btn-outline btn-sm" 
                    onClick={fetchReport}
                    style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                    disabled={reportLoading}
                  >
                    {reportLoading ? <span className="spinner spinner-dark" style={{ width: 12, height: 12 }} /> : <i className="fa-solid fa-rotate-right" />}
                    Tải lại
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div style={{ padding: '14px 22px 4px', background: '#ffffff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Kỳ báo cáo</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#15803d', marginTop: 3 }}>{reportData?.periodLabel || '...'}</div>
                  <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>{reportData?.summary?.totalRecords || 0} hồ sơ tổng cộng</div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Tổng tiền đã thu</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1d4ed8', marginTop: 3 }}>
                    {(reportData?.summary?.totalFee || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <div style={{ fontSize: 12, color: '#1e40af', marginTop: 2 }}>
                    <strong>{reportData?.summary?.confirmedCount || 0}</strong> hồ sơ x 85.000 đ
                  </div>
                </div>

                <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', textTransform: 'uppercase' }}>Hóa đơn điện tử</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#a16207', marginTop: 3 }}>
                    {reportData?.summary?.issuedInvoiceCount || 0} / {reportData?.summary?.totalRecords || 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#854d0e', marginTop: 2 }}>
                    Chờ xuất: {reportData?.summary?.unissuedInvoiceCount || 0} hồ sơ
                  </div>
                </div>

                <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>Bàn giao Khoa PCBTN</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#7e22ce', marginTop: 3 }}>
                    {reportData?.summary?.transferredCount || 0} hồ sơ
                  </div>
                  <div style={{ fontSize: 12, color: '#6b21a8', marginTop: 2 }}>Cán bộ khoa theo dõi &amp; cấp phiếu</div>
                </div>
              </div>
            </div>

            {/* Data Preview Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 22px 16px', minHeight: 240 }}>
              {reportLoading ? (
                <div style={{ textAlign: 'center', padding: 50 }}>
                  <span className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
                  <div style={{ marginTop: 10, fontSize: 13, color: '#64748b' }}>Đang tải dữ liệu báo cáo...</div>
                </div>
              ) : !reportData?.records || reportData.records.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 50, color: '#64748b' }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }} />
                  <div>Không có hồ sơ nào phù hợp với bộ lọc trong kỳ báo cáo này.</div>
                </div>
              ) : (
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 10 }}>
                    <tr>
                      <th style={{ width: 36, textAlign: 'center' }}>STT</th>
                      <th style={{ width: 85 }}>Mã HS</th>
                      <th>Khách hàng / CCCD</th>
                      <th>Điện thoại / Địa chỉ</th>
                      <th>Đơn vị / MST</th>
                      <th>Email nhận HĐ</th>
                      <th style={{ width: 80, textAlign: 'right' }}>Lệ phí</th>
                      <th style={{ width: 85, textAlign: 'center' }}>Thu phí</th>
                      <th style={{ width: 85, textAlign: 'center' }}>Số HĐĐT</th>
                      <th>Cán bộ PCBTN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.records.map((r, idx) => (
                      <tr key={r.id}>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{r.id}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>CCCD: {r.cccd}</div>
                        </td>
                        <td>
                          <div>{r.phone}</div>
                          <div style={{ fontSize: 11, color: '#64748b', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.address}</div>
                        </td>
                        <td>
                          {r.invoice_company_name ? (
                            <div>
                              <div style={{ fontWeight: 600, color: '#0369a1' }}>{r.invoice_company_name}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>MST: {r.invoice_tax_code || '—'}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>Cá nhân</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: 11 }}>{r.invoice_email || r.email || '—'}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#047857' }}>
                          85.000 đ
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {r.payment_confirmed ? (
                            <div>
                              <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 6px' }}>Đã thu tiền</span>
                              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                {r.payment_confirmed_at ? new Date(r.payment_confirmed_at).toLocaleDateString('vi-VN') : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="badge badge-pending" style={{ fontSize: 10, padding: '2px 6px' }}>Chưa thu</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {r.invoice_no ? (
                            <div>
                              <span style={{ fontWeight: 700, color: '#1e40af' }}>{r.invoice_no}</span>
                              {r.invoice_file_url && (
                                <a href={r.invoice_file_url} target="_blank" rel="noreferrer" style={{ marginLeft: 4, color: '#0284c7' }} title="Xem file HĐĐT">
                                  <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10 }} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td>
                          {r.handler_name ? (
                            <span style={{ fontWeight: 600, color: '#475569' }}>{r.handler_name}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa phân công</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div style={{
              padding: '14px 22px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
            }}>
              <div style={{ fontSize: 12, color: '#475569' }}>
                <i className="fa-solid fa-building-columns" style={{ color: '#047857', marginRight: 6 }} />
                Tài khoản BIDV: <strong>5611147422</strong> | Cán bộ thu phí: <strong>Lê Thị Mỹ Phượng</strong>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setShowReportModal(false)}
                >
                  Đóng
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={printReport}
                  disabled={!reportData?.records?.length}
                  style={{ color: '#1e40af', borderColor: '#93c5fd' }}
                >
                  <i className="fa-solid fa-print" /> In Báo cáo / Lưu PDF
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={exportReportCSV}
                  disabled={!reportData?.records?.length}
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  <i className="fa-solid fa-file-excel" /> Xuất file Excel (CSV)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐỔI MẬT KHẨU */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16
        }}>
          <div style={{
            background: 'white', borderRadius: 12, maxWidth: 440, width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-key" style={{ color: 'var(--primary)' }} />
                Đổi mật khẩu tài khoản
              </h3>
              <button 
                onClick={() => setShowPasswordModal(false)} 
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleChangePassword} style={{ padding: 20 }}>
              {pwError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
                  {pwSuccess}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Mật khẩu hiện tại <span className="required">*</span></label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={pwForm.currentPassword} 
                  onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} 
                  placeholder="Nhập mật khẩu hiện tại..." 
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Mật khẩu mới (tối thiểu 6 ký tự) <span className="required">*</span></label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={pwForm.newPassword} 
                  onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} 
                  placeholder="Nhập mật khẩu mới..." 
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Xác nhận mật khẩu mới <span className="required">*</span></label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={pwForm.confirmPassword} 
                  onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} 
                  placeholder="Nhập lại mật khẩu mới..." 
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setShowPasswordModal(false)}
                  disabled={pwSaving}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={pwSaving}
                >
                  {pwSaving ? <><span className="spinner" /> Đang cập nhật...</> : <><i className="fa-solid fa-check" /> Cập nhật mật khẩu</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
