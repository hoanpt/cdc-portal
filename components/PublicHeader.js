'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="pub-header">
      <div className="pub-header-inner">
        <Link href="/" className="pub-logo">
          {/* Placeholder: thay bằng file logo thực sau */}
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
              <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>v2.1.0</span>
            </div>
            <p>Phòng bệnh chủ động, vươn rộng tương lai</p>
          </div>
        </Link>

        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/submit" className={`btn btn-sm ${pathname === '/submit' ? 'btn-primary' : 'btn-ghost'}`}>
            <i className="fa-solid fa-file-signature" />
            Nộp hồ sơ
          </Link>
          <Link href="/track" className={`btn btn-sm ${pathname === '/track' ? 'btn-primary' : 'btn-ghost'}`}>
            <i className="fa-solid fa-magnifying-glass" />
            Tra cứu
          </Link>
          <Link href="/admin" className="btn btn-sm btn-outline" style={{ marginLeft: 4 }}>
            <i className="fa-solid fa-lock" />
            <span style={{ display: 'none' }} className="md-show">Quản trị</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
