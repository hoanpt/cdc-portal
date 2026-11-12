'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

export default function PublicHeader() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="pub-header">
      <div className="pub-header-inner">
        <Link href="/" className="pub-logo">
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #0263e0, #1e40af)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 20, fontWeight: 800, flexShrink: 0,
          }}>C</div>
          <div className="pub-logo-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h1>CDC Đà Nẵng</h1>
              <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>v2.2.0</span>
            </div>
            <p>{t('slogan')}</p>
          </div>
        </Link>

        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/submit" className={`btn btn-sm ${pathname === '/submit' ? 'btn-primary' : 'btn-ghost'}`}>
            <i className="fa-solid fa-file-signature" />
            {t('submit')}
          </Link>
          <Link href="/track" className={`btn btn-sm ${pathname === '/track' ? 'btn-primary' : 'btn-ghost'}`}>
            <i className="fa-solid fa-magnifying-glass" />
            {t('track')}
          </Link>

          {/* Language Switcher */}
          <button 
            type="button"
            className="btn btn-sm"
            onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
            style={{
              background: '#f1f5f9',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              fontWeight: 600,
              fontSize: 12.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 6,
              cursor: 'pointer'
            }}
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            {lang === 'vi' ? (
              <>
                <span style={{ fontSize: 14 }}>🇬🇧</span> English
              </>
            ) : (
              <>
                <span style={{ fontSize: 14 }}>🇻🇳</span> Tiếng Việt
              </>
            )}
          </button>

          <Link href="/admin" className="btn btn-sm btn-outline" style={{ marginLeft: 4 }} title={t('admin')}>
            <i className="fa-solid fa-lock" />
            <span style={{ display: 'none' }} className="md-show">{t('admin')}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
