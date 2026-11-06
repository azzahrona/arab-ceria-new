import { Link, NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/belajar', label: '📚 Belajar' },
  { to: '/kuis', label: '⭐ Kuis' },
  { to: '/permainan', label: '🎮 Permainan' },
  { to: '/progres', label: '🏆 Progres' },
  { to: '/guru', label: '👩‍🏫 Guru' }
];

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Arab Ceria, halaman utama">
            <span className="brand-mark">أ</span>
            <span><strong>Arab Ceria</strong><small>Belajar jadi menyenangkan!</small></span>
          </Link>
          <nav className="main-nav" aria-label="Navigasi utama">
            {links.map((link) => <NavLink key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>)}
          </nav>
          <div className="header-action"><span className="user-chip">🌟 Mode belajar langsung</span></div>
        </div>
      </header>
      <main className="page-main">{children}</main>
      <footer className="site-footer">
        <span>🌈 Arab Ceria</span>
        <span>Belajar sedikit demi sedikit, hebat setiap hari!</span>
      </footer>
    </div>
  );
}
