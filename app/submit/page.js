'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import styles from './submit.module.css';

import { paymentConfig as fallbackConfig } from '@/lib/paymentConfig';

const STEPS = ['Thông tin cá nhân', 'Giấy tờ đính kèm', 'Hình thức nhận KQ', 'Thanh toán & Hóa đơn', 'Xác nhận & Gửi'];

export default function SubmitPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [appId, setAppId] = useState(() => 'CDC-' + Math.floor(100000 + Math.random() * 900000));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [paymentConfig, setPaymentConfig] = useState(fallbackConfig);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => { if (data.bankId) setPaymentConfig(data); })
      .catch(console.error);
  }, []);

  const [form, setForm] = useState({
    name: '',
    cccd: '',
    cccd_confirm: '',
    dob: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    committed: false,
    receive_method: 'direct',
    notes: '',
    // Thông tin xuất hóa đơn điện tử
    invoice_type: 'personal', // 'personal' hoặc 'company'
    invoice_company_name: '',
    invoice_tax_code: '',
    invoice_budget_code: '',
    invoice_address: '',
    invoice_email: '',
  });

  const [files, setFiles] = useState({ file_vaccine: null, file_payment: null });

  function set(field, value) {
    setForm(prev => {
      const nextForm = { ...prev, [field]: value };
      // Nếu đổi email cá nhân và invoice_email chưa điền, tự đồng bộ
      if (field === 'email' && !prev.invoice_email) {
        nextForm.invoice_email = value;
      }
      // Nếu đổi địa chỉ cá nhân và invoice_address chưa điền, tự đồng bộ
      if (field === 'address' && !prev.invoice_address) {
        nextForm.invoice_address = value;
      }
      return nextForm;
    });
    setError('');
  }

  function validateStep() {
    if (step === 0) {
      if (!form.name.trim()) return 'Vui lòng nhập họ và tên người sử dụng dịch vụ';
      
      const cccd = form.cccd.trim();
      if (!cccd) return 'Vui lòng nhập số CCCD / Mã định danh / Hộ chiếu';
      if (cccd.length < 6 || cccd.length > 15) return 'Số CCCD/Hộ chiếu phải từ 6 đến 15 ký tự';
      if (!/^[a-zA-Z0-9]+$/.test(cccd)) return 'Số CCCD/Hộ chiếu chỉ chứa chữ cái và số';

      const cccdConfirm = form.cccd_confirm.trim();
      if (!cccdConfirm) return 'Vui lòng nhập lại số CCCD/Hộ chiếu để xác nhận';
      if (cccd !== cccdConfirm) return 'Số CCCD/Hộ chiếu xác nhận không trùng khớp. Vui lòng kiểm tra lại thật chính xác.';

      const phone = form.phone.trim();
      if (!phone) return 'Vui lòng nhập số điện thoại liên hệ';
      if (!/^\+?[0-9]{9,15}$/.test(phone.replace(/[\s-]/g, ''))) return 'Số điện thoại không hợp lệ (9-15 số)';

      if (!form.address.trim()) return 'Vui lòng nhập địa chỉ của người sử dụng dịch vụ';

      if (!form.email.trim()) return 'Vui lòng nhập thông tin email liên hệ';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Email không hợp lệ';

      if (!form.committed) {
        return 'Vui lòng đọc và tích chọn cam đoan tính chính xác của thông tin trước khi chuyển sang bước tiếp theo';
      }
    }

    if (step === 1) {
      if (!files.file_vaccine) return 'Vui lòng đính kèm file ảnh hoặc PDF Sổ / Chứng nhận tiêm chủng';
    }

    if (step === 3) {
      if (!files.file_payment) return 'Vui lòng đính kèm Ảnh chụp biên lai thanh toán chuyển khoản thành công';

      // Kiểm tra hóa đơn điện tử
      if (form.invoice_type === 'company') {
        if (!form.invoice_company_name.trim()) return 'Vui lòng nhập Tên cơ quan, tổ chức / Công ty xuất hóa đơn';
        if (!form.invoice_tax_code.trim()) return 'Vui lòng nhập Mã số thuế của cơ quan / công ty';
        if (!form.invoice_address.trim()) return 'Vui lòng nhập Địa chỉ cơ quan / công ty xuất hóa đơn';
        if (!form.invoice_email.trim()) return 'Vui lòng nhập Email cơ quan nhận hóa đơn điện tử';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.invoice_email.trim())) return 'Email cơ quan nhận hóa đơn điện tử không hợp lệ';
      } else {
        const invEmail = (form.invoice_email || form.email).trim();
        if (!invEmail) return 'Vui lòng nhập Email nhận hóa đơn điện tử';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invEmail)) return 'Email nhận hóa đơn điện tử không hợp lệ';
      }
    }

    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('id', appId);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (files.file_vaccine) fd.append('file_vaccine', files.file_vaccine);
      if (files.file_payment) fd.append('file_payment', files.file_payment);

      const res = await fetch('/api/applications', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra');
        return;
      }

      setResult(data);
    } catch (e) {
      setError('Lỗi kết nối: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // Chuyển khoản content syntax: Thanh toán phí cấp phiếu TCCN cho [Tên khách hàng] - [Mã HS]
  const transferContent = `Thanh toán phí cấp phiếu TCCN cho ${form.name ? form.name.trim() : 'KH'} - ${appId}`;
  const fixedFee = 85000;

  if (result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PublicHeader />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
          <div className="card" style={{ maxWidth: 540, width: '100%', textAlign: 'center' }}>
            <div className="card-body" style={{ padding: 48 }}>
              <div style={{ fontSize: 64, color: 'var(--success)', marginBottom: 20 }}>
                <i className="fa-solid fa-circle-check" />
              </div>
              <h2 style={{ fontSize: 24, marginBottom: 10 }}>Nộp hồ sơ thành công!</h2>
              <p style={{ marginBottom: 24, color: 'var(--text-muted)' }}>Hệ thống đã tiếp nhận hồ sơ của bạn. Vui lòng lưu lại mã tra cứu:</p>
              <div className={styles.trackingCode}>{result.id}</div>
              
              <div className="alert alert-info" style={{ textAlign: 'left', marginTop: 24, marginBottom: 24, fontSize: 13, lineHeight: 1.6 }}>
                <div><i className="fa-solid fa-receipt" style={{ marginRight: 6 }} /> <strong>Quy trình xử lý:</strong></div>
                <div>1. Bộ phận Kế toán kiểm tra xác nhận thanh toán và lập Hóa đơn điện tử.</div>
                <div>2. Khoa Phòng chống bệnh truyền nhiễm (PCBTN) đối chiếu lịch sử tiêm chủng và cấp Giấy chứng nhận.</div>
                <div>3. Kết quả Giấy chứng nhận & Hóa đơn điện tử sẽ được trả theo phương thức bạn đã đăng ký.</div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => router.push('/track?id=' + result.id)}>
                  <i className="fa-solid fa-magnifying-glass" /> Theo dõi hồ sơ
                </button>
                <button className="btn btn-outline" onClick={() => { 
                  setResult(null); 
                  setStep(0); 
                  setForm({
                    name:'', cccd:'', cccd_confirm:'', dob:'', gender:'', phone:'', email:'', address:'',
                    committed: false, receive_method:'direct', notes:'',
                    invoice_type: 'personal', invoice_company_name: '', invoice_tax_code: '',
                    invoice_budget_code: '', invoice_address: '', invoice_email: ''
                  }); 
                  setFiles({ file_vaccine: null, file_payment: null }); 
                  setAppId('CDC-' + Math.floor(100000 + Math.random() * 900000));
                }}>
                  Nộp hồ sơ khác
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicHeader />

      <div className={styles.container}>
        {/* Stepper */}
        <div className={styles.stepper}>
          {STEPS.map((s, i) => (
            <div key={i} className={`${styles.stepItem} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}>
              <div className={styles.stepNum}>
                {i < step ? <i className="fa-solid fa-check" /> : i + 1}
              </div>
              <span className={styles.stepLabel}>{s}</span>
              {i < STEPS.length - 1 && <div className={styles.stepLine} />}
            </div>
          ))}
        </div>

        <div className="card" style={{ maxWidth: 740, margin: '0 auto 60px', width: '100%' }}>
          <div className="card-header">
            <h3 style={{ fontSize: 18 }}>
              <i className="fa-solid fa-file-signature" style={{ color: 'var(--primary)', marginRight: 10 }} />
              {STEPS[step]}
            </h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bước {step + 1} / {STEPS.length}</span>
          </div>

          <div className="card-body">
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                <i className="fa-solid fa-triangle-exclamation" />
                {error}
              </div>
            )}

            {/* STEP 0: Thông tin cá nhân & Cam đoan */}
            {step === 0 && (
              <div>
                <div className="alert alert-info" style={{ marginBottom: 20, fontSize: 13 }}>
                  <i className="fa-solid fa-shield-halved" style={{ fontSize: 16 }} />
                  <strong>Chính sách bảo mật:</strong> Để đảm bảo an toàn thông tin cá nhân và tránh lộ lọt hình ảnh giấy tờ tùy thân, CDC Đà Nẵng <strong>không yêu cầu tải ảnh chụp CCCD/Hộ chiếu</strong>. Quý khách vui lòng nhập và đối chiếu thật chính xác số CCCD/Hộ chiếu để làm căn cứ cấp giấy chứng nhận.
                </div>

                <div className={styles.formGrid}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Họ và tên người sử dụng dịch vụ <span className="required">*</span></label>
                    <input className="form-control" placeholder="NGUYỄN VĂN A" value={form.name} onChange={e => set('name', e.target.value.toUpperCase())} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số CCCD / Mã định danh / Hộ chiếu <span className="required">*</span></label>
                    <input className="form-control" placeholder="Nhập số giấy tờ" value={form.cccd} onChange={e => set('cccd', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Xác nhận lại số CCCD / Hộ chiếu <span className="required">*</span></label>
                    <input className="form-control" placeholder="Nhập lại chính xác để xác nhận" value={form.cccd_confirm} onChange={e => set('cccd_confirm', e.target.value)} />
                    {form.cccd && form.cccd_confirm && (
                      <div style={{ fontSize: 12, marginTop: 4, color: form.cccd === form.cccd_confirm ? 'var(--success)' : 'var(--danger)' }}>
                        {form.cccd === form.cccd_confirm ? '✓ Số giấy tờ đã trùng khớp' : '✗ Chưa trùng khớp với số đã nhập ở trên'}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số điện thoại liên hệ <span className="required">*</span></label>
                    <input className="form-control" placeholder="0901234567" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email liên hệ <span className="required">*</span></label>
                    <input className="form-control" type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ngày sinh</label>
                    <input className="form-control" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Giới tính</label>
                    <select className="form-control" value={form.gender} onChange={e => set('gender', e.target.value)}>
                      <option value="">— Chọn —</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Địa chỉ thường trú / Nơi ở <span className="required">*</span></label>
                    <input className="form-control" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" value={form.address} onChange={e => set('address', e.target.value)} />
                  </div>
                </div>

                {/* Hộp cam đoan */}
                <div style={{ marginTop: 24, padding: '16px 20px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      style={{ width: 18, height: 18, marginTop: 3, cursor: 'pointer', accentColor: 'var(--primary)' }}
                      checked={form.committed}
                      onChange={e => set('committed', e.target.checked)}
                    />
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: '#1e293b' }}>
                      <strong style={{ color: '#0f172a' }}>
                        Tôi xin cam đoan các thông tin cung cấp trên đây là chính xác và chịu trách nhiệm trước pháp luật về thông tin đã cung cấp.
                      </strong>
                      <div style={{ fontStyle: 'italic', color: '#64748b', marginTop: 4 }}>
                        I hereby certify that the information provided above is accurate and take full legal responsibility for the information provided.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 1: Giấy tờ đính kèm (Chỉ Sổ tiêm chủng) */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="alert alert-info" style={{ fontSize: 13 }}>
                  <i className="fa-solid fa-circle-info" />
                  Vui lòng tải lên ảnh chụp hoặc bản scan <strong>Sổ tiêm chủng / Giấy xác nhận tiêm chủng</strong> rõ nét để cán bộ y tế đối chiếu các mũi tiêm.
                </div>

                <div className="file-drop" onClick={() => document.getElementById('file_vaccine').click()} style={{ borderColor: files.file_vaccine ? 'var(--success)' : 'var(--border)' }}>
                  <input id="file_vaccine" type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => { setFiles(f => ({ ...f, file_vaccine: e.target.files[0] })); setError(''); }} />
                  {files.file_vaccine ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                      <i className="fa-solid fa-file-circle-check" style={{ fontSize: 32, color: 'var(--success)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>{files.file_vaccine.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(files.file_vaccine.size / 1024).toFixed(1)} KB — Click để thay đổi file khác</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <i className="fa-solid fa-syringe" style={{ fontSize: 36, color: 'var(--primary)', marginBottom: 12 }} />
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Sổ / Chứng nhận tiêm chủng <span style={{ color: 'var(--danger)' }}>*</span></div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chụp trang thông tin cá nhân và các trang ghi nhận mũi tiêm hợp lệ. Chấp nhận: JPG, PNG, PDF (tối đa 10MB).</p>
                      <div className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>
                        <i className="fa-solid fa-upload" /> Chọn file đính kèm
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Hình thức nhận kết quả */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { value: 'direct', icon: 'fa-building', label: 'Nhận trực tiếp tại CDC Đà Nẵng', desc: 'Đến nhận trực tiếp tại bộ phận Một cửa — CDC Đà Nẵng (118 Lê Đình Lý, Thanh Khê, TP. Đà Nẵng).' },
                  { value: 'email', icon: 'fa-envelope', label: 'Nhận qua Email', desc: 'Giấy chứng nhận bản scan (PDF có dấu đỏ) và Hóa đơn điện tử sẽ được gửi về email đã đăng ký.' },
                  { value: 'postal', icon: 'fa-truck', label: 'Gửi qua Bưu điện', desc: 'Giấy chứng nhận bản gốc sẽ được chuyển phát đến địa chỉ của bạn (người nhận thanh toán cước bưu điện).' },
                ].map(opt => (
                  <label key={opt.value} className={`${styles.receiveOption} ${form.receive_method === opt.value ? styles.receiveSelected : ''}`}>
                    <input type="radio" name="receive_method" value={opt.value} checked={form.receive_method === opt.value} onChange={() => set('receive_method', opt.value)} style={{ display: 'none' }} />
                    <div className={styles.receiveIcon}><i className={`fa-solid ${opt.icon}`} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{opt.label}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{opt.desc}</div>
                    </div>
                    {form.receive_method === opt.value && <i className="fa-solid fa-circle-check" style={{ color: 'var(--primary)', fontSize: 20 }} />}
                  </label>
                ))}
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label">Ghi chú thêm (nếu có)</label>
                  <textarea className="form-control" rows={3} placeholder="Yêu cầu đặc biệt hoặc thông tin bổ sung cho cán bộ tiếp nhận..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
            )}

            {/* STEP 3: Thanh toán lệ phí & Xuất Hóa đơn điện tử */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Khối thông tin chuyển khoản */}
                <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <h4 style={{ color: 'var(--primary)', fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-building-columns" /> Thông tin tài khoản nhận thanh toán của Trung tâm:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, fontSize: 13.5 }}>
                    <div>• Tên đơn vị: <strong>Trung tâm Kiểm soát bệnh tật thành phố Đà Nẵng</strong></div>
                    <div>• Địa chỉ: <strong>118 Lê Đình Lý, phường Thanh Khê, TP. Đà Nẵng</strong></div>
                    <div>• Ngân hàng: <strong>BIDV - Chi nhánh Đà Nẵng</strong></div>
                    <div>• Số tài khoản: <strong style={{ color: 'var(--primary)', fontSize: 16 }}>5611147422</strong></div>
                    <div>• Số tiền lệ phí cố định: <strong style={{ color: 'var(--danger)', fontSize: 16 }}>{fixedFee.toLocaleString()} VNĐ</strong></div>
                    <div>• Nội dung chuyển khoản: <strong style={{ color: 'var(--primary)' }}>{transferContent}</strong></div>
                  </div>
                </div>

                {/* Khối VietQR */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                  <h5 style={{ fontSize: 15, marginBottom: 12, color: 'var(--text)' }}>
                    <i className="fa-solid fa-qrcode" style={{ marginRight: 6, color: 'var(--primary)' }} />
                    Quét mã QR để thanh toán nhanh (BIDV VietQR)
                  </h5>
                  <img 
                    src={`https://img.vietqr.io/image/bidv-5611147422-compact2.jpg?amount=${fixedFee}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent('TRUNG TAM KIEM SOAT BENH TAT THANH PHO DA NANG')}`}
                    alt="BIDV VietQR"
                    style={{ width: '100%', maxWidth: 260, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>Mã QR đã điền sẵn số tiền 85.000 VNĐ và nội dung chuyển khoản hợp lệ</p>
                </div>

                {/* Upload biên lai */}
                <div className="file-drop" onClick={() => document.getElementById('file_payment').click()} style={{ borderColor: files.file_payment ? 'var(--success)' : 'var(--border)' }}>
                  <input id="file_payment" type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => { setFiles(f => ({ ...f, file_payment: e.target.files[0] })); setError(''); }} />
                  {files.file_payment ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                      <i className="fa-solid fa-file-invoice-dollar" style={{ fontSize: 32, color: 'var(--success)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>{files.file_payment.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(files.file_payment.size / 1024).toFixed(1)} KB — Click để đổi ảnh khác</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 8 }} />
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Tải lên Ảnh chụp biên lai / Giao dịch chuyển khoản <span style={{ color: 'var(--danger)' }}>*</span></div>
                      <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Chụp ảnh màn hình chuyển khoản thành công từ ứng dụng ngân hàng</p>
                      <div className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>Chọn ảnh / file</div>
                    </>
                  )}
                </div>

                {/* Khối Đăng ký Thông tin Xuất Hóa đơn điện tử */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 20, background: '#fafafa' }}>
                  <h4 style={{ fontSize: 16, marginBottom: 12, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-receipt" style={{ color: 'var(--primary)' }} />
                    Thông tin Xuất Hóa đơn điện tử (Bắt buộc theo quy định)
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Kế toán thu phí sẽ kiểm tra tiền và phát hành Hóa đơn điện tử gửi về email cung cấp dưới đây.
                  </p>

                  <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="radio" 
                        name="invoice_type" 
                        value="personal" 
                        checked={form.invoice_type === 'personal'} 
                        onChange={() => set('invoice_type', 'personal')} 
                      />
                      Xuất hóa đơn cho Cá nhân
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="radio" 
                        name="invoice_type" 
                        value="company" 
                        checked={form.invoice_type === 'company'} 
                        onChange={() => set('invoice_type', 'company')} 
                      />
                      Xuất hóa đơn về Công ty / Cơ quan
                    </label>
                  </div>

                  {form.invoice_type === 'personal' ? (
                    <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                        <div>• Người mua hàng: <strong>{form.name || '(Chưa nhập)'}</strong></div>
                        <div>• Số CCCD/Định danh: <strong>{form.cccd || '(Chưa nhập)'}</strong></div>
                        <div style={{ gridColumn: '1 / -1' }}>• Địa chỉ: <strong>{form.address || '(Chưa nhập)'}</strong></div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Email nhận Hóa đơn điện tử <span className="required">*</span></label>
                        <input 
                          className="form-control" 
                          type="email" 
                          placeholder="email@example.com" 
                          value={form.invoice_email || form.email} 
                          onChange={e => set('invoice_email', e.target.value)} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Tên cơ quan, tổ chức / Công ty <span className="required">*</span></label>
                        <input 
                          className="form-control" 
                          placeholder="CÔNG TY TNHH ABC..." 
                          value={form.invoice_company_name} 
                          onChange={e => set('invoice_company_name', e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Mã số thuế <span className="required">*</span></label>
                        <input 
                          className="form-control" 
                          placeholder="0400123456" 
                          value={form.invoice_tax_code} 
                          onChange={e => set('invoice_tax_code', e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Mã quan hệ ngân sách (Mã QHNS)</label>
                        <input 
                          className="form-control" 
                          placeholder="Nếu có" 
                          value={form.invoice_budget_code} 
                          onChange={e => set('invoice_budget_code', e.target.value)} 
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Địa chỉ cơ quan / công ty theo ĐKKD <span className="required">*</span></label>
                        <input 
                          className="form-control" 
                          placeholder="Địa chỉ trụ sở công ty" 
                          value={form.invoice_address} 
                          onChange={e => set('invoice_address', e.target.value)} 
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Email nhận Hóa đơn điện tử của cơ quan <span className="required">*</span></label>
                        <input 
                          className="form-control" 
                          type="email" 
                          placeholder="ketoan@congty.com" 
                          value={form.invoice_email} 
                          onChange={e => set('invoice_email', e.target.value)} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Xác nhận & Gửi */}
            {step === 4 && (
              <div>
                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                  <i className="fa-solid fa-info-circle" />
                  Vui lòng kiểm tra lại thông tin trước khi gửi. Sau khi nộp, Kế toán sẽ kiểm tra xác nhận thu phí và chuyển Khoa PCBTN xử lý cấp giấy chứng nhận.
                </div>

                <div className={styles.confirmGrid}>
                  {[
                    ['Mã hồ sơ đăng ký', appId],
                    ['Họ và tên người sử dụng dịch vụ', form.name],
                    ['Số CCCD / Định danh / Hộ chiếu', form.cccd],
                    ['Số điện thoại', form.phone],
                    ['Email liên hệ', form.email],
                    ['Địa chỉ', form.address],
                    ['Hình thức nhận KQ', form.receive_method === 'email' ? 'Qua Email' : form.receive_method === 'postal' ? 'Bưu điện' : 'Nhận trực tiếp tại CDC'],
                    ['Lệ phí cấp phiếu', `${fixedFee.toLocaleString()} VNĐ (BIDV 5611147422)`],
                    ['Loại hóa đơn điện tử', form.invoice_type === 'company' ? 'Xuất về Cơ quan / Công ty' : 'Xuất cho Cá nhân'],
                    form.invoice_type === 'company' ? ['Tên đơn vị xuất HĐ', form.invoice_company_name] : null,
                    form.invoice_type === 'company' ? ['Mã số thuế', form.invoice_tax_code] : null,
                    form.invoice_type === 'company' && form.invoice_budget_code ? ['Mã QHNS', form.invoice_budget_code] : null,
                    ['Email nhận HĐĐT', form.invoice_email || form.email],
                    ['File Sổ tiêm chủng', files.file_vaccine?.name || 'Chưa đính kèm'],
                    ['Ảnh biên lai thanh toán', files.file_payment?.name || 'Chưa đính kèm'],
                  ].filter(Boolean).map(([label, value]) => (
                    <div key={label} className={styles.confirmRow}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, padding: 14, background: '#f1f5f9', borderRadius: 8, fontSize: 13, color: '#334155' }}>
                  <i className="fa-solid fa-circle-check" style={{ color: 'var(--success)', marginRight: 6 }} />
                  <strong>Cam đoan:</strong> Người nộp đã cam đoan chịu trách nhiệm trước pháp luật về tính chính xác của toàn bộ thông tin đã cung cấp.
                </div>
              </div>
            )}
          </div>

          <div className="card-footer" style={{ justifyContent: 'space-between' }}>
            {step > 0 ? (
              <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>
                <i className="fa-solid fa-arrow-left" /> Quay lại
              </button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={next}>
                Tiếp theo <i className="fa-solid fa-arrow-right" />
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={submit} disabled={loading}>
                {loading ? <><span className="spinner" /> Đang gửi hồ sơ...</> : <><i className="fa-solid fa-paper-plane" /> Gửi hồ sơ đăng ký</>}
              </button>
            )}
          </div>
        </div>
      </div>

      <footer className="pub-footer">
        <p><strong>Trung tâm Kiểm soát bệnh tật TP. Đà Nẵng (CDC Đà Nẵng)</strong> — 118 Lê Đình Lý, Thanh Khê, Đà Nẵng.</p>
      </footer>
    </div>
  );
}
