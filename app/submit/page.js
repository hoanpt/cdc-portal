'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import styles from './submit.module.css';
import { paymentConfig as fallbackConfig } from '@/lib/paymentConfig';
import { useLanguage } from '@/lib/i18n';

function removeVietnameseTones(str) {
  if (!str) return '';
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

export default function SubmitPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const STEPS = [
    t('step_0'),
    t('step_1'),
    t('step_2'),
    t('step_3'),
    t('step_4'),
  ];

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
    passport: '',
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
      if (!form.name.trim()) return t('err_name');
      
      const cccd = form.cccd.trim();
      if (!cccd) return t('err_cccd');
      if (cccd.length < 6 || cccd.length > 15) return t('err_cccd_len');
      if (!/^[a-zA-Z0-9]+$/.test(cccd)) return lang === 'en' ? 'ID number must contain only letters and digits' : 'Số CCCD chỉ chứa chữ cái và số';

      const cccdConfirm = form.cccd_confirm.trim();
      if (!cccdConfirm) return t('err_cccd_confirm');
      if (cccd !== cccdConfirm) return t('err_cccd_mismatch');

      // Ngày sinh & Giới tính là bắt buộc
      if (!form.dob) return t('err_dob');
      if (!form.gender) return t('err_gender');

      const phone = form.phone.trim();
      if (!phone) return t('err_phone');
      if (!/^\+?[0-9]{9,15}$/.test(phone.replace(/[\s-]/g, ''))) return t('err_phone');

      if (!form.address.trim()) return t('err_address');

      // Email cá nhân không bắt buộc, nhưng nếu có điền thì phải đúng định dạng
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        return t('err_email_invalid');
      }

      if (!form.committed) {
        return t('err_commit');
      }
    }

    if (step === 1) {
      if (!files.file_vaccine) return t('err_vaccine');
    }

    if (step === 2) {
      // Trường email không bắt buộc, chỉ khi chọn nhận qua email thì bắt nhập email
      if (form.receive_method === 'email' && !form.email.trim()) {
        return t('err_email_required_for_method');
      }
    }

    if (step === 3) {
      if (!files.file_payment) return t('err_receipt');

      // Kiểm tra hóa đơn điện tử
      if (form.invoice_type === 'company') {
        if (!form.invoice_company_name.trim()) return t('err_inv_company');
        if (!form.invoice_tax_code.trim()) return t('err_inv_tax');
        if (!form.invoice_address.trim()) return t('err_inv_addr');
        if (!form.invoice_email.trim()) return t('err_inv_email');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.invoice_email.trim())) return t('err_email_invalid');
      } else {
        // Hóa đơn cá nhân
        if (form.invoice_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.invoice_email.trim())) {
          return t('err_email_invalid');
        }
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

      const res = await fetch('/api/applications', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (lang === 'en' ? 'Submission error' : 'Lỗi nộp hồ sơ'));

      setResult({ id: appId });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Nội dung chuyển tiền: TT GCNTC Họ Tên người gửi
  const transferContent = `TT GCNTC ${form.name ? form.name.trim().toUpperCase() : (lang === 'en' ? 'FULL NAME' : 'HO VA TEN')}`;
  const cleanTransferContentForQr = removeVietnameseTones(transferContent);
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
              <h2 style={{ fontSize: 24, marginBottom: 10 }}>{t('result_title')}</h2>
              <p style={{ marginBottom: 24, color: 'var(--text-muted)' }}>{t('result_desc')}</p>
              <div className={styles.trackingCode}>{result.id}</div>
              
              <div className="alert alert-info" style={{ textAlign: 'left', marginTop: 24, marginBottom: 24, fontSize: 13, lineHeight: 1.6 }}>
                <div><i className="fa-solid fa-receipt" style={{ marginRight: 6 }} /> <strong>{t('workflow_title')}</strong></div>
                <div>{t('workflow_1')}</div>
                <div>{t('workflow_2')}</div>
                <div>{t('workflow_3')}</div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => router.push('/track?id=' + result.id)}>
                  <i className="fa-solid fa-magnifying-glass" /> {t('btn_track_now')}
                </button>
                <button className="btn btn-outline" onClick={() => { 
                  setResult(null); 
                  setAppId('CDC-' + Math.floor(100000 + Math.random() * 900000));
                  setStep(0); 
                  setForm({
                    name:'', cccd:'', cccd_confirm:'', passport:'', dob:'', gender:'', phone:'', email:'', address:'',
                    committed: false, receive_method:'direct', notes:'',
                    invoice_type: 'personal', invoice_company_name: '', invoice_tax_code: '',
                    invoice_budget_code: '', invoice_address: '', invoice_email: ''
                  }); 
                  setFiles({ file_vaccine: null, file_payment: null }); 
                }}>
                  {t('btn_submit_another')}
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
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {t('step_indicator', { current: step + 1, total: STEPS.length })}
            </span>
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
                  <strong>{t('privacy_title')}</strong> {t('privacy_desc')}
                </div>

                <div className={styles.formGrid}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">{t('full_name')} <span className="required">*</span></label>
                    <input className="form-control" placeholder={t('full_name_ph')} value={form.name} onChange={e => set('name', e.target.value.toUpperCase())} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('cccd')} <span className="required">*</span></label>
                    <input className="form-control" placeholder={t('cccd_ph')} value={form.cccd} onChange={e => set('cccd', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('cccd_confirm')} <span className="required">*</span></label>
                    <input className="form-control" placeholder={t('cccd_confirm_ph')} value={form.cccd_confirm} onChange={e => set('cccd_confirm', e.target.value)} />
                    {form.cccd && form.cccd_confirm && (
                      <div style={{ fontSize: 12, marginTop: 4, color: form.cccd === form.cccd_confirm ? 'var(--success)' : 'var(--danger)' }}>
                        {form.cccd === form.cccd_confirm ? t('cccd_match') : t('cccd_mismatch')}
                      </div>
                    )}
                  </div>

                  {/* Bổ sung trường Hộ chiếu (Không bắt buộc) */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('passport')}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 'normal' }}>({lang === 'en' ? 'Optional' : 'Không bắt buộc'})</span>
                    </label>
                    <input 
                      className="form-control" 
                      placeholder={t('passport_ph')} 
                      value={form.passport} 
                      onChange={e => set('passport', e.target.value.toUpperCase())} 
                    />
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                      {t('passport_hint')}
                    </div>
                  </div>

                  {/* Ngày sinh (Bắt buộc) */}
                  <div className="form-group">
                    <label className="form-label">{t('dob')} <span className="required">*</span></label>
                    <input 
                      className="form-control" 
                      type="date" 
                      value={form.dob} 
                      onChange={e => set('dob', e.target.value)} 
                      required
                    />
                  </div>

                  {/* Giới tính (Bắt buộc) */}
                  <div className="form-group">
                    <label className="form-label">{t('gender')} <span className="required">*</span></label>
                    <select 
                      className="form-control" 
                      value={form.gender} 
                      onChange={e => set('gender', e.target.value)}
                      required
                    >
                      <option value="">{t('gender_select')}</option>
                      <option value="Nam">{t('gender_male')}</option>
                      <option value="Nữ">{t('gender_female')}</option>
                      <option value="Khác">{t('gender_other')}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('phone')} <span className="required">*</span></label>
                    <input className="form-control" placeholder={t('phone_ph')} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>

                  {/* Email liên hệ (Không bắt buộc - Chỉ bắt buộc khi nhận qua email) */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('email')}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 'normal' }}>({lang === 'en' ? 'Optional' : 'Không bắt buộc'})</span>
                    </label>
                    <input className="form-control" type="email" placeholder={t('email_ph')} value={form.email} onChange={e => set('email', e.target.value)} />
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                      {t('email_hint')}
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">{t('address')} <span className="required">*</span></label>
                    <input className="form-control" placeholder={t('address_ph')} value={form.address} onChange={e => set('address', e.target.value)} />
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
                  {t('doc_vaccine_desc')}
                </div>

                <div className="file-drop" onClick={() => document.getElementById('file_vaccine').click()} style={{ borderColor: files.file_vaccine ? 'var(--success)' : 'var(--border)' }}>
                  <input id="file_vaccine" type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => { setFiles(f => ({ ...f, file_vaccine: e.target.files[0] })); setError(''); }} />
                  {files.file_vaccine ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                      <i className="fa-solid fa-file-circle-check" style={{ fontSize: 32, color: 'var(--success)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>{files.file_vaccine.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(files.file_vaccine.size / 1024).toFixed(1)} KB — {lang === 'en' ? 'Click to change file' : 'Click để thay đổi file khác'}</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <i className="fa-solid fa-syringe" style={{ fontSize: 36, color: 'var(--primary)', marginBottom: 12 }} />
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{t('doc_vaccine_title')} <span style={{ color: 'var(--danger)' }}>*</span></div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('file_formats')}</p>
                      <div className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>
                        <i className="fa-solid fa-upload" /> {lang === 'en' ? 'Choose File' : 'Chọn file đính kèm'}
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
                  { value: 'direct', icon: 'fa-building', label: t('method_direct'), desc: t('method_direct_desc') },
                  { value: 'email', icon: 'fa-envelope', label: t('method_email'), desc: t('method_email_desc') },
                  { value: 'postal', icon: 'fa-truck', label: t('method_postal'), desc: t('method_postal_desc') },
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

                {form.receive_method === 'email' && !form.email.trim() && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, fontSize: 13, color: '#b91c1c' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                    {lang === 'en' ? 'You chose Email delivery. Please make sure to enter your Email address in Step 1.' : 'Bạn đã chọn nhận kết quả qua Email. Vui lòng quay lại Bước 1 điền Email nếu chưa nhập.'}
                  </div>
                )}

                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label">{t('notes')}</label>
                  <textarea className="form-control" rows={3} placeholder={t('notes_ph')} value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
            )}

            {/* STEP 3: Thanh toán lệ phí & Xuất Hóa đơn điện tử */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Khối thông tin chuyển khoản */}
                <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <h4 style={{ color: 'var(--primary)', fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-building-columns" /> {t('payment_title')}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, fontSize: 13.5 }}>
                    <div>• {t('org_name_label')} <strong>{t('org_name_val')}</strong></div>
                    <div>• {t('org_addr_label')} <strong>{t('org_addr_val')}</strong></div>
                    <div>• {t('bank_name_label')} <strong>{t('bank_name_val')}</strong></div>
                    <div>• {t('acc_no_label')} <strong style={{ color: 'var(--primary)', fontSize: 16 }}>5611147422</strong></div>
                    <div>• {t('fee_label')} <strong style={{ color: 'var(--danger)', fontSize: 16 }}>{fixedFee.toLocaleString()} VNĐ</strong></div>
                    <div>• {t('transfer_content_label')} <strong style={{ color: 'var(--primary)', fontSize: 15, background: '#eff6ff', padding: '2px 8px', borderRadius: 4 }}>{transferContent}</strong></div>
                  </div>
                </div>

                {/* Khối VietQR */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                  <h5 style={{ fontSize: 15, marginBottom: 12, color: 'var(--text)' }}>
                    <i className="fa-solid fa-qrcode" style={{ marginRight: 6, color: 'var(--primary)' }} />
                    {t('qr_title')}
                  </h5>
                  <img 
                    src={`https://img.vietqr.io/image/bidv-5611147422-compact2.jpg?amount=${fixedFee}&addInfo=${encodeURIComponent(cleanTransferContentForQr)}&accountName=${encodeURIComponent('TRUNG TAM KIEM SOAT BENH TAT THANH PHO DA NANG')}`}
                    alt="BIDV VietQR"
                    style={{ width: '100%', maxWidth: 260, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>{t('qr_desc')}</p>
                </div>

                {/* Upload biên lai */}
                <div className="file-drop" onClick={() => document.getElementById('file_payment').click()} style={{ borderColor: files.file_payment ? 'var(--success)' : 'var(--border)' }}>
                  <input id="file_payment" type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => { setFiles(f => ({ ...f, file_payment: e.target.files[0] })); setError(''); }} />
                  {files.file_payment ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                      <i className="fa-solid fa-file-invoice-dollar" style={{ fontSize: 32, color: 'var(--success)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>{files.file_payment.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(files.file_payment.size / 1024).toFixed(1)} KB — {lang === 'en' ? 'Click to change' : 'Click để chọn file khác'}</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <i className="fa-solid fa-receipt" style={{ fontSize: 36, color: 'var(--primary)', marginBottom: 12 }} />
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{t('receipt_title')} <span style={{ color: 'var(--danger)' }}>*</span></div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('receipt_desc')}</p>
                      <div className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>
                        <i className="fa-solid fa-upload" /> {lang === 'en' ? 'Choose Screenshot' : 'Chọn ảnh biên lai'}
                      </div>
                    </>
                  )}
                </div>

                {/* KHỐI XUẤT HÓA ĐƠN ĐIỆN TỬ */}
                <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <h4 style={{ color: 'var(--primary)', fontSize: 16, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-file-invoice" /> {t('invoice_sec_title')}
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    {t('invoice_sec_desc')}
                  </p>

                  <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                      <input 
                        type="radio" 
                        name="invoice_type" 
                        value="personal" 
                        checked={form.invoice_type === 'personal'} 
                        onChange={() => set('invoice_type', 'personal')} 
                      />
                      <strong>{t('invoice_type_personal')}</strong>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                      <input 
                        type="radio" 
                        name="invoice_type" 
                        value="company" 
                        checked={form.invoice_type === 'company'} 
                        onChange={() => set('invoice_type', 'company')} 
                      />
                      <strong>{t('invoice_type_company')}</strong>
                    </label>
                  </div>

                  {form.invoice_type === 'personal' ? (
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                      <div style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
                        • {lang === 'en' ? 'Buyer Name:' : 'Người mua hàng:'} <strong>{form.name || (lang === 'en' ? 'Applicant' : 'Khách hàng')}</strong> | {lang === 'en' ? 'Citizen ID:' : 'Số CCCD:'} <strong>{form.cccd || '...'}</strong>
                        {form.passport && <span> | {lang === 'en' ? 'Passport:' : 'Hộ chiếu:'} <strong>{form.passport}</strong></span>}
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">{t('invoice_personal_email')}</label>
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
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">{t('invoice_company_name')} <span className="required">*</span></label>
                        <input 
                          className="form-control" 
                          placeholder={t('invoice_company_name_ph')} 
                          value={form.invoice_company_name} 
                          onChange={e => set('invoice_company_name', e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{t('invoice_tax_code')} <span className="required">*</span></label>
                        <input 
                          className="form-control" 
                          placeholder={t('invoice_tax_code_ph')} 
                          value={form.invoice_tax_code} 
                          onChange={e => set('invoice_tax_code', e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{t('invoice_budget_code')}</label>
                        <input 
                          className="form-control" 
                          placeholder="Ví dụ: 1054321 (nếu có)" 
                          value={form.invoice_budget_code} 
                          onChange={e => set('invoice_budget_code', e.target.value)} 
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">{t('invoice_company_addr')} <span className="required">*</span></label>
                        <input 
                          className="form-control" 
                          placeholder="Địa chỉ trụ sở công ty..." 
                          value={form.invoice_address} 
                          onChange={e => set('invoice_address', e.target.value)} 
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">{t('invoice_company_email')} <span className="required">*</span></label>
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
                <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
                  {t('review_desc')}
                </p>

                <div className={styles.confirmGrid}>
                  {[
                    [lang === 'en' ? 'Application ID' : 'Mã hồ sơ đăng ký', appId],
                    [t('full_name'), form.name],
                    [t('cccd'), form.cccd],
                    form.passport ? [t('passport'), form.passport] : null,
                    [t('dob'), form.dob ? new Date(form.dob).toLocaleDateString('vi-VN') : '—'],
                    [t('gender'), form.gender === 'Nam' ? t('gender_male') : form.gender === 'Nữ' ? t('gender_female') : form.gender],
                    [t('phone'), form.phone],
                    [t('email'), form.email || (lang === 'en' ? 'None provided' : 'Không cung cấp')],
                    [t('address'), form.address],
                    [t('receive_title'), form.receive_method === 'email' ? t('method_email') : form.receive_method === 'postal' ? t('method_postal') : t('method_direct')],
                    [t('fee_label'), `85.000 VNĐ (BIDV 5611147422)`],
                    [lang === 'en' ? 'Invoice Type' : 'Loại hóa đơn điện tử', form.invoice_type === 'company' ? t('invoice_type_company') : t('invoice_type_personal')],
                    form.invoice_type === 'company' ? [t('invoice_company_name'), form.invoice_company_name] : null,
                    form.invoice_type === 'company' ? [t('invoice_tax_code'), form.invoice_tax_code] : null,
                    form.invoice_type === 'company' && form.invoice_budget_code ? [t('invoice_budget_code'), form.invoice_budget_code] : null,
                    [t('invoice_personal_email'), form.invoice_email || form.email || (lang === 'en' ? 'None' : 'Chưa nhập')],
                    [t('doc_vaccine_title'), files.file_vaccine?.name || '—'],
                    [t('receipt_title'), files.file_payment?.name || '—'],
                  ].filter(Boolean).map(([label, value]) => (
                    <div key={label} className={styles.confirmRow}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, padding: 14, background: '#f1f5f9', borderRadius: 8, fontSize: 13, color: '#334155' }}>
                  <i className="fa-solid fa-circle-check" style={{ color: 'var(--success)', marginRight: 6 }} />
                  <strong>{lang === 'en' ? 'Certified:' : 'Cam đoan:'}</strong> {lang === 'en' ? 'The applicant has legally certified the accuracy of all submitted information.' : 'Người nộp đã cam đoan chịu trách nhiệm trước pháp luật về tính chính xác của toàn bộ thông tin đã cung cấp.'}
                </div>
              </div>
            )}
          </div>

          <div className="card-footer" style={{ justifyContent: 'space-between' }}>
            {step > 0 ? (
              <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>
                <i className="fa-solid fa-arrow-left" /> {t('btn_back')}
              </button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={next}>
                {t('btn_next')} <i className="fa-solid fa-arrow-right" />
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={submit} disabled={loading}>
                {loading ? <><span className="spinner" /> {t('btn_submitting')}</> : <><i className="fa-solid fa-paper-plane" /> {t('btn_submit')}</>}
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
