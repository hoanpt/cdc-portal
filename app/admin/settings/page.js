'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingMobifone, setTestingMobifone] = useState(false);
  const [mobifoneTestResult, setMobifoneTestResult] = useState(null);
  const [settings, setSettings] = useState({
    app_url: 'http://localhost:3000',
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '"CDC Đà Nẵng" <noreply@cdc-danang.gov.vn>',
    zalo_token: '',
    zalo_template_id: '',
    zalo_notify_phones: '',
    mobifone_api_url: 'https://api.mobifoneinvoice.vn',
    mobifone_username: '',
    mobifone_password: '',
    mobifone_tax_code: '0401999999',
    mobifone_ma_dvcs: 'VP',
    mobifone_cctbao_id: '',
    mobifone_template_code: '1/001',
    mobifone_series: '1C24TDD',
    mobifone_auto_sign_hsm: 'true',
    mobifone_gui_cqt: 'Notsend',
    mobifone_enabled: 'false'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      // Chỉ Admin mới có quyền truy cập Cấu hình hệ thống
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.user?.role !== 'admin') {
          alert('Tài khoản của bạn không có quyền truy cập Cấu hình hệ thống.');
          router.push('/admin/dashboard');
          return;
        }
      }

      const res = await fetch('/api/settings');
      if (res.status === 401 || res.status === 403) { router.push('/admin'); return; }
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function saveSettings(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('✅ Đã lưu cấu hình thành công!');
    } catch(e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestMobifone() {
    setTestingMobifone(true);
    setMobifoneTestResult(null);
    try {
      const res = await fetch('/api/settings/test-mobifone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMobifoneTestResult({
          success: false,
          error: data.error || 'Kiểm tra kết nối thất bại'
        });
      } else {
        setMobifoneTestResult({
          success: true,
          message: data.message,
          maDvcs: data.maDvcs,
          seriesList: data.seriesList || []
        });
      }
    } catch (err) {
      setMobifoneTestResult({
        success: false,
        error: 'Lỗi mạng hoặc máy chủ không phản hồi: ' + err.message
      });
    } finally {
      setTestingMobifone(false);
    }
  }

  if (loading) return (
    <div className={styles.adminLayout}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <span className="spinner spinner-dark" style={{ width: 40, height: 40 }} />
      </div>
    </div>
  );

  return (
    <div className={styles.adminLayout}>
      <nav className={styles.adminNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/dashboard" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-arrow-left" />
          </Link>
          <span style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>
            <i className="fa-solid fa-gear" style={{ marginRight: 8, color: '#60a5fa' }} />
            Cấu hình hệ thống
          </span>
        </div>
      </nav>

      <div className={styles.adminContent} style={{ maxWidth: 800 }}>
        
        {/* 1. THÔNG TIN THU PHÍ & TÀI KHOẢN BIDV (Cố định theo quy định) */}
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="card-header" style={{ background: '#f0fdf4' }}>
            <h3 style={{ color: '#047857' }}>
              <i className="fa-solid fa-building-columns" style={{ marginRight: 10 }} />
              Thông tin Tài khoản Thu phí &amp; Lệ phí cấp phiếu (Cố định)
            </h3>
            <span className="badge badge-completed">Đã kích hoạt</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13.5 }}>
              <div>• Đơn vị thụ hưởng: <strong>Trung tâm Kiểm soát bệnh tật thành phố Đà Nẵng</strong></div>
              <div>• Ngân hàng: <strong>BIDV — Chi nhánh Đà Nẵng</strong></div>
              <div>• Số tài khoản: <strong style={{ color: '#16a34a', fontSize: 15 }}>5611147422</strong></div>
              <div>• Mức lệ phí cấp phiếu: <strong style={{ color: '#dc2626', fontSize: 15 }}>85.000 VNĐ</strong></div>
              <div>• Địa chỉ đơn vị: <strong>118 Lê Đình Lý, phường Thanh Khê, TP. Đà Nẵng</strong></div>
              <div>• Cán bộ phụ trách thu phí: <strong>Lê Thị Mỹ Phượng</strong> (tk: <code>lethimyphuong</code>)</div>
              <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, marginTop: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Cú pháp chuyển khoản tự động trên mã QR: </span>
                <code style={{ color: '#2563eb', fontWeight: 700 }}>Thanh toán phí cấp phiếu TCCN cho [Tên khách hàng] - [Mã HS]</code>
              </div>
            </div>
          </div>
        </div>

        {/* 2. CẤU HÌNH TÊN MIỀN HỆ THỐNG */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3><i className="fa-solid fa-globe" style={{ color: 'var(--primary)', marginRight: 10 }} /> Cấu hình Tên miền Hệ thống (App URL)</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Địa chỉ website dùng để gửi link tra cứu cho công dân</span>
          </div>
          <div className="card-body">
            <form onSubmit={saveSettings}>
              <div className="form-group">
                <label className="form-label">Tên miền hệ thống (Domain URL)</label>
                <input 
                  className="form-control" 
                  value={settings.app_url} 
                  onChange={e => setSettings({...settings, app_url: e.target.value})} 
                  placeholder="VD: https://gcn.danang.gov.vn hoặc https://tên-miền-của-bạn" 
                  required 
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Đường dẫn này dùng để tạo liên kết tra cứu hồ sơ gửi trong email thông báo cho khách hàng. Không để dấu <code>/</code> ở cuối.
                </span>
              </div>
              <div style={{ marginTop: 14 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Đang lưu...</> : <><i className="fa-solid fa-save" /> Lưu tên miền</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 3. CẤU HÌNH GỬI EMAIL TỰ ĐỘNG (SMTP) */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3><i className="fa-solid fa-envelope" style={{ color: 'var(--primary)', marginRight: 10 }} /> Cấu hình Gửi Email (SMTP)</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tự động gửi Giấy chứng nhận và Hóa đơn điện tử qua email khách hàng</span>
          </div>
          <div className="card-body">
            <form onSubmit={saveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Tên hiển thị người gửi</label>
                <input className="form-control" value={settings.smtp_from} onChange={e => setSettings({...settings, smtp_from: e.target.value})} placeholder='"CDC Đà Nẵng" <email_cua_ban@gmail.com>' required />
              </div>

              <div className="form-group">
                <label className="form-label">Máy chủ SMTP (Host)</label>
                <input className="form-control" value={settings.smtp_host} onChange={e => setSettings({...settings, smtp_host: e.target.value})} placeholder="VD: smtp.gmail.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Cổng (Port)</label>
                <input className="form-control" value={settings.smtp_port} onChange={e => setSettings({...settings, smtp_port: e.target.value})} placeholder="VD: 587" />
              </div>

              <div className="form-group">
                <label className="form-label">Tài khoản Email (User)</label>
                <input className="form-control" value={settings.smtp_user} onChange={e => setSettings({...settings, smtp_user: e.target.value})} placeholder="email_cua_ban@gmail.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu ứng dụng (App Password)</label>
                <input className="form-control" type="password" value={settings.smtp_pass === '********' ? '' : settings.smtp_pass} onChange={e => setSettings({...settings, smtp_pass: e.target.value})} placeholder={settings.smtp_pass === '********' ? '********' : 'Nhập mật khẩu ứng dụng...'} />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Kết nối bảo mật (Secure SSL/TLS)</label>
                <select className="form-control" value={settings.smtp_secure} onChange={e => setSettings({...settings, smtp_secure: e.target.value})}>
                  <option value="false">Không (Thường dùng với Port 587)</option>
                  <option value="true">Có (Thường dùng với Port 465)</option>
                </select>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  Ghi chú: Nếu bạn sử dụng Gmail, hãy bật bảo mật 2 lớp (2FA) và tạo <strong>Mật khẩu ứng dụng (App Password)</strong> để điền vào ô Mật khẩu. KHÔNG dùng mật khẩu đăng nhập Gmail thông thường.
                </p>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Đang lưu...</> : <><i className="fa-solid fa-save" /> Lưu cấu hình Email</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 4. CẤU HÌNH THÔNG BÁO ZALO OA */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3><i className="fa-solid fa-bell" style={{ color: '#0284c7', marginRight: 10 }} /> Cấu hình Thông báo Zalo OA</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gửi thông báo đẩy về máy người thu phí &amp; cán bộ tiếp nhận khi có hồ sơ mới</span>
          </div>
          <div className="card-body">
            <form onSubmit={saveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Zalo OA Access Token</label>
                <input className="form-control" type="password" value={settings.zalo_token} onChange={e => setSettings({...settings, zalo_token: e.target.value})} placeholder="Nhập Access Token của Zalo Official Account..." />
              </div>

              <div className="form-group">
                <label className="form-label">ZNS Template ID (Nếu sử dụng mẫu thông báo)</label>
                <input className="form-control" value={settings.zalo_template_id} onChange={e => setSettings({...settings, zalo_template_id: e.target.value})} placeholder="VD: 312345" />
              </div>

              <div className="form-group">
                <label className="form-label">Số điện thoại cán bộ nhận thông báo (Phân cách bằng dấu phẩy)</label>
                <input className="form-control" value={settings.zalo_notify_phones} onChange={e => setSettings({...settings, zalo_notify_phones: e.target.value})} placeholder="0905xxxxxx, 0914xxxxxx (SĐT Lê Thị Mỹ Phượng, cán bộ Khoa PCBTN...)" />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  Hệ thống sẽ tự động gửi tin nhắn báo có hồ sơ mới cùng thông tin người nộp, lệ phí 85.000đ BIDV tới các số điện thoại này.
                </p>
              </div>

              <div style={{ marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Đang lưu...</> : <><i className="fa-solid fa-save" /> Lưu cấu hình Zalo OA</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 5. CẤU HÌNH HÓA ĐƠN ĐIỆN TỬ MOBIFONE INVOICE (TT78/NĐ 123) */}
        <div className="card" style={{ marginTop: 24, border: '1.5px solid #0284c7' }}>
          <div className="card-header" style={{ background: '#f0f9ff' }}>
            <div>
              <h3 style={{ color: '#0369a1', margin: 0 }}>
                <i className="fa-solid fa-bolt" style={{ color: '#0284c7', marginRight: 10 }} />
                Kết nối API Hóa đơn điện tử MobiFone (MobiFone Invoice TT78)
              </h3>
              <p style={{ fontSize: 13, color: '#0284c7', margin: '4px 0 0' }}>
                Tích hợp chuẩn Thông tư 78/2021/TT-BTC &amp; Nghị định 123/2020/NĐ-CP
              </p>
            </div>
            <span className="badge" style={{ background: settings.mobifone_enabled === 'true' ? '#10b981' : '#94a3b8', color: 'white' }}>
              {settings.mobifone_enabled === 'true' ? 'API đang bật' : 'Mô phỏng tại chỗ'}
            </span>
          </div>
          <div className="card-body">
            {/* Kết quả kiểm tra kết nối */}
            {mobifoneTestResult && (
              <div style={{
                marginBottom: 18,
                padding: '12px 16px',
                borderRadius: 8,
                background: mobifoneTestResult.success ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${mobifoneTestResult.success ? '#a7f3d0' : '#fecaca'}`,
                color: mobifoneTestResult.success ? '#065f46' : '#991b1b',
                fontSize: 13.5
              }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <i className={`fa-solid ${mobifoneTestResult.success ? 'fa-circle-check' : 'fa-circle-exclamation'}`} />
                  {mobifoneTestResult.success ? 'Kiểm tra kết nối thành công!' : 'Kết nối thất bại:'}
                </div>
                <div>{mobifoneTestResult.message || mobifoneTestResult.error}</div>
                {mobifoneTestResult.seriesList && mobifoneTestResult.seriesList.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #a7f3d0' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#047857', marginBottom: 6 }}>
                      Dải ký hiệu HĐĐT tìm thấy trên MobiFone (Bấm vào để tự động chọn):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {mobifoneTestResult.seriesList.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, mobifone_series: s.khieu, mobifone_cctbao_id: s.cctbao_id }))}
                          style={{
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#15803d',
                            cursor: 'pointer'
                          }}
                        >
                          Ký hiệu: {s.khieu} (Mã: {s.cctbao_id.slice(0, 8)}...)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={saveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">MobiFone Invoice API URL</label>
                <input 
                  className="form-control" 
                  value={settings.mobifone_api_url} 
                  onChange={e => setSettings({...settings, mobifone_api_url: e.target.value})} 
                  placeholder="https://api.mobifoneinvoice.vn hoặc https://{MST}.mobifoneinvoice.vn" 
                />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Địa chỉ API cổng HĐĐT MobiFone của đơn vị (Mặc định: <code>https://api.mobifoneinvoice.vn</code> hoặc <code>https://MST.mobifoneinvoice.vn</code>).
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Tài khoản kết nối API (Username) <span className="required">*</span></label>
                <input 
                  className="form-control" 
                  value={settings.mobifone_username} 
                  onChange={e => setSettings({...settings, mobifone_username: e.target.value})} 
                  placeholder="Tài khoản API MobiFone..." 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu kết nối API (Password) <span className="required">*</span></label>
                <input 
                  className="form-control" 
                  type="password" 
                  value={settings.mobifone_password} 
                  onChange={e => setSettings({...settings, mobifone_password: e.target.value})} 
                  placeholder="Mật khẩu API MobiFone..." 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mã số thuế bên bán (CDC Đà Nẵng)</label>
                <input 
                  className="form-control" 
                  value={settings.mobifone_tax_code} 
                  onChange={e => setSettings({...settings, mobifone_tax_code: e.target.value})} 
                  placeholder="0401999999" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mã đơn vị cơ sở (ma_dvcs)</label>
                <input 
                  className="form-control" 
                  value={settings.mobifone_ma_dvcs} 
                  onChange={e => setSettings({...settings, mobifone_ma_dvcs: e.target.value})} 
                  placeholder="VP" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mẫu số hóa đơn (Template Code)</label>
                <input 
                  className="form-control" 
                  value={settings.mobifone_template_code} 
                  onChange={e => setSettings({...settings, mobifone_template_code: e.target.value})} 
                  placeholder="1/001" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ký hiệu hóa đơn (Series)</label>
                <input 
                  className="form-control" 
                  value={settings.mobifone_series} 
                  onChange={e => setSettings({...settings, mobifone_series: e.target.value})} 
                  placeholder="1C24TDD hoặc C26TDD" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">ID dải ký hiệu (cctbao_id / qlkhsdung_id)</label>
                <input 
                  className="form-control" 
                  value={settings.mobifone_cctbao_id} 
                  onChange={e => setSettings({...settings, mobifone_cctbao_id: e.target.value})} 
                  placeholder="Để trống hệ thống sẽ tự động tra cứu từ API RF00059" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ký số điện tử bằng HSM MobiFone</label>
                <select 
                  className="form-control" 
                  value={settings.mobifone_auto_sign_hsm} 
                  onChange={e => setSettings({...settings, mobifone_auto_sign_hsm: e.target.value})}
                >
                  <option value="true">Tự động ký số HSM (SaveAndSignHSMHoadon78)</option>
                  <option value="false">Lập hóa đơn ở trạng thái Chờ ký (SaveListHoadon78)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Chế độ gửi Cơ quan Thuế (guiCQT)</label>
                <select 
                  className="form-control" 
                  value={settings.mobifone_gui_cqt} 
                  onChange={e => setSettings({...settings, mobifone_gui_cqt: e.target.value})}
                >
                  <option value="Notsend">Notsend (Lưu tạm và ký, chưa gửi thuế ngay)</option>
                  <option value="">Gửi thẳng lên Cơ quan Thuế (CQT)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Trạng thái kết nối API</label>
                <select 
                  className="form-control" 
                  value={settings.mobifone_enabled} 
                  onChange={e => setSettings({...settings, mobifone_enabled: e.target.value})}
                >
                  <option value="false">Mô phỏng tại chỗ (Simulator / Dự phòng an toàn)</option>
                  <option value="true">Bật kết nối API thực tế đến cổng MobiFone Invoice</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: '#0284c7' }}>
                  {saving ? <><span className="spinner" /> Đang lưu...</> : <><i className="fa-solid fa-save" /> Lưu cấu hình MobiFone Invoice</>}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleTestMobifone} 
                  disabled={testingMobifone}
                  style={{ background: '#0f172a', color: 'white' }}
                >
                  {testingMobifone ? (
                    <><span className="spinner" /> Đang kiểm tra kết nối...</>
                  ) : (
                    <><i className="fa-solid fa-network-wired" /> Kiểm tra kết nối MobiFone</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
