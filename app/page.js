'use client';
import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';
import styles from './page.module.css';
import { useLanguage } from '@/lib/i18n';

export default function HomePage() {
  const { lang, t } = useLanguage();

  return (
    <div className={styles.page}>
      <PublicHeader />

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className={styles.heroBadge}>
            <i className="fa-solid fa-shield-halved" />
            {lang === 'en' ? 'One-Stop Mechanism — Transparent & Rapid' : 'Cơ chế một cửa — Minh bạch & Nhanh chóng'}
          </div>
          <h2>
            {lang === 'en' ? <>Online Vaccination<br />Certification Portal</> : <>Cổng Xét Duyệt<br />Chứng Nhận Tiêm Chủng</>}
          </h2>
          <p>
            {lang === 'en'
              ? 'Official online portal for citizens and foreign nationals to register, submit documents, and track vaccination certificates at Danang Center for Disease Control.'
              : 'Hệ thống phục vụ người dân đăng ký, nộp hồ sơ và tra cứu kết quả trực tuyến nhanh chóng, thuận tiện tại Trung tâm Kiểm soát Bệnh tật TP. Đà Nẵng.'}
          </p>

          <div className={styles.heroActions}>
            <Link href="/submit" className="btn btn-lg" style={{ background: 'white', color: 'var(--primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              <i className="fa-solid fa-file-signature" />
              {lang === 'en' ? 'Submit Application' : 'Nộp hồ sơ ngay'}
            </Link>
            <Link href="/track" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.5)' }}>
              <i className="fa-solid fa-magnifying-glass" />
              {lang === 'en' ? 'Track Status' : 'Tra cứu hồ sơ'}
            </Link>
          </div>

          {/* 4 bước quy trình */}
          <div className="steps">
            {[
              { icon: 'fa-file-arrow-up', label: lang === 'en' ? 'Submit' : 'Nộp hồ sơ' },
              { icon: 'fa-inbox', label: lang === 'en' ? 'Receive' : 'Tiếp nhận' },
              { icon: 'fa-gears', label: lang === 'en' ? 'Review' : 'Xét duyệt' },
              { icon: 'fa-certificate', label: lang === 'en' ? 'Issue' : 'Cấp chứng nhận' },
            ].map((s, i) => (
              <div key={i} className="step">
                <div className="step-icon"><i className={`fa-solid ${s.icon}`} /></div>
                <span className="step-label">
                  {lang === 'en' ? `Step ${i + 1}` : `Bước ${i + 1}`}<br />{s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cards */}
      <main className={styles.main}>
        <div className={styles.cardGrid}>
          <Link href="/submit" className={styles.portalCard}>
            <div className={styles.cardIcon} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <i className="fa-solid fa-file-signature" />
            </div>
            <h3>{lang === 'en' ? 'Submit Online Application' : 'Nộp hồ sơ trực tuyến'}</h3>
            <p>
              {lang === 'en'
                ? 'Create and submit documents to request a new vaccination certificate or confirm previous vaccine doses.'
                : 'Khởi tạo và gửi hồ sơ đề nghị cấp mới chứng nhận hoặc xác nhận các mũi tiêm chủng trước đó.'}
            </p>
            <div className={styles.cardBtn}>
              {lang === 'en' ? 'Start Application' : 'Bắt đầu nộp'} <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>

          <Link href="/track" className={styles.portalCard}>
            <div className={styles.cardIcon} style={{ background: '#ecfdf5', color: 'var(--success)' }}>
              <i className="fa-solid fa-magnifying-glass-chart" />
            </div>
            <h3>{lang === 'en' ? 'Track Application Progress' : 'Tra cứu tiến độ hồ sơ'}</h3>
            <p>
              {lang === 'en'
                ? 'Check real-time processing updates of your submitted application using the tracking code or Citizen ID / Passport.'
                : 'Kiểm tra cập nhật quá trình xét duyệt của hồ sơ đã nộp thông qua mã số giao dịch hoặc số CCCD/Hộ chiếu.'}
            </p>
            <div className={styles.cardBtn}>
              {lang === 'en' ? 'Track Now' : 'Tra cứu ngay'} <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>
        </div>

        {/* Info section */}
        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>
            {lang === 'en' ? 'Required Documents to Prepare' : 'Thành phần hồ sơ cần chuẩn bị'}
          </h2>
          <div className={styles.docGrid}>
            {[
              { 
                icon: 'fa-id-card', 
                title: lang === 'en' ? 'Citizen ID / Passport' : 'CCCD / Hộ chiếu', 
                desc: lang === 'en' 
                  ? 'Accurate number of Citizen ID, National ID, or Passport (no photo upload required for privacy).' 
                  : 'Số CCCD hoặc Hộ chiếu còn hiệu lực (không cần chụp ảnh giấy tờ để đảm bảo an toàn bảo mật).' 
              },
              { 
                icon: 'fa-syringe', 
                title: lang === 'en' ? 'Immunization Record / Booklet' : 'Sổ/Chứng nhận tiêm chủng', 
                desc: lang === 'en'
                  ? 'Clear photo or PDF scan of the vaccination booklet pages recording administered vaccine doses.'
                  : 'Bản chụp các trang ghi nhận các mũi tiêm chủng đã được ghi nhận hợp lệ trước đó.' 
              },
              { 
                icon: 'fa-envelope', 
                title: lang === 'en' ? 'Contact Email (Optional)' : 'Email liên hệ (nếu có)', 
                desc: lang === 'en'
                  ? 'To receive automatic status notifications and e-invoice / PDF certificate via email.'
                  : 'Để nhận thông báo tự động về trạng thái hồ sơ, hóa đơn điện tử và chứng nhận qua email.' 
              },
            ].map((d, i) => (
              <div key={i} className={styles.docCard}>
                <div className={styles.docIcon}><i className={`fa-solid ${d.icon}`} /></div>
                <div>
                  <h4>{d.title}</h4>
                  <p>{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className={styles.contactBar}>
          <i className="fa-solid fa-headset" style={{ fontSize: 24, color: 'var(--primary)' }} />
          <div>
            <strong>{lang === 'en' ? 'Need Assistance?' : 'Cần hỗ trợ?'}</strong>
            <span>
              {lang === 'en' 
                ? 'Contact Danang CDC Hotline: 0236.3890412 — Address: 118 Le Dinh Ly, Thanh Khe District, Danang City'
                : 'Liên hệ CDC Đà Nẵng: 0236.3890412 — Địa chỉ: 118 Lê Đình Lý, Thanh Khê, Đà Nẵng'}
            </span>
          </div>
        </div>
      </main>

      <footer className="pub-footer">
        <p><strong>Trung tâm Kiểm soát Bệnh tật TP. Đà Nẵng (CDC Đà Nẵng)</strong></p>
        <p>118 Lê Đình Lý, Quận Thanh Khê, TP. Đà Nẵng &nbsp;|&nbsp; ĐT: 0236.3890412</p>
        <p style={{ marginTop: 8, opacity: 0.6 }}>© 2026 CDC Đà Nẵng. Hệ thống tiếp nhận hồ sơ trực tuyến.</p>
      </footer>
    </div>
  );
}
