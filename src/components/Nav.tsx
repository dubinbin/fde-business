import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const LINKS = [
  { id: 'library', label: '场景库' },
  { id: 'delivery', label: '我们如何交付' },
];

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="7" fill="#181d1b" stroke="#39423d" strokeWidth="1" />
      <path d="M8 21.5V11h3.2l4 7.2V11h3v10.5h-3.1l-4.1-7.3v7.3H8z" fill="#3FD6B0" />
      <circle cx="23.5" cy="20.5" r="2" fill="#3FD6B0" opacity="0.55" />
    </svg>
  );
}

export default function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goSection = (id: string) => {
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/', { state: { scrollTo: id } });
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-200 ${
        scrolled ? 'border-line bg-ink-900/92 backdrop-blur' : 'border-transparent bg-ink-900/60 backdrop-blur'
      }`}
    >
      <div className="shell flex h-14 items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-2.5 rounded-sm">
          <BrandMark />
          <span className="text-[14px] font-medium tracking-tight text-cream">
             <span className="text-teal">FDE</span>
          </span>
          <span className="hidden text-[11px] text-muted sm:inline">场景实验室</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="主导航">
          {LINKS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => goSection(l.id)}
              className="rounded-md px-2.5 py-1.5 text-[13px] text-body transition-colors hover:bg-ink-800 hover:text-cream"
            >
              {l.label}
            </button>
          ))}
          <Link
            to="/scenario/quote"
            className="btn-primary ml-1 px-3 py-1.5 text-[12.5px]"
          >
            体验报价演示
          </Link>
        </nav>
      </div>
    </header>
  );
}
