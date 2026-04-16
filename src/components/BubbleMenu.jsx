import { useState } from 'react';
import './BubbleMenu.css';

const DEFAULT_ITEMS = [
  { label: 'overview', href: '#', ariaLabel: 'Overview', rotation: -8, hoverStyles: { bgColor: '#3b82f6', textColor: '#ffffff' } },
  { label: 'maps', href: '#maps', ariaLabel: 'Maps', rotation: 8, hoverStyles: { bgColor: '#10b981', textColor: '#ffffff' } },
  { label: 'ops', href: '#ops', ariaLabel: 'Operations', rotation: 8, hoverStyles: { bgColor: '#f59e0b', textColor: '#111111' } },
  { label: 'gcp', href: '#stack', ariaLabel: 'Google Cloud stack', rotation: 8, hoverStyles: { bgColor: '#ef4444', textColor: '#ffffff' } },
  { label: 'demo', href: '#demo', ariaLabel: 'Demo', rotation: -8, hoverStyles: { bgColor: '#8b5cf6', textColor: '#ffffff' } },
];

export default function BubbleMenu({
  logo,
  onMenuClick,
  className,
  style,
  menuAriaLabel = 'Toggle menu',
  menuBg = '#fff',
  menuContentColor = '#111',
  useFixedPosition = false,
  items,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuItems = items?.length ? items : DEFAULT_ITEMS;

  const handleToggle = () => {
    const nextState = !isMenuOpen;
    setIsMenuOpen(nextState);
    onMenuClick?.(nextState);
  };

  return (
    <>
      <nav
        className={['bubble-menu', useFixedPosition ? 'fixed' : 'absolute', className].filter(Boolean).join(' ')}
        style={style}
        aria-label="Main navigation"
      >
        <div className="bubble logo-bubble" aria-label="Logo" style={{ background: menuBg }}>
          <span className="logo-content">
            {typeof logo === 'string' ? <span>{logo}</span> : logo}
          </span>
        </div>

        <button
          type="button"
          className={`bubble toggle-bubble menu-btn ${isMenuOpen ? 'open' : ''}`}
          onClick={handleToggle}
          aria-label={menuAriaLabel}
          aria-pressed={isMenuOpen}
          style={{ background: menuBg }}
        >
          <span className="menu-line" style={{ background: menuContentColor }} />
          <span className="menu-line" style={{ background: menuContentColor }} />
        </button>
      </nav>

      {isMenuOpen && (
        <div className={`bubble-menu-items ${useFixedPosition ? 'fixed' : 'absolute'}`} aria-hidden={!isMenuOpen}>
          <ul className="pill-list" role="menu" aria-label="Menu links">
            {menuItems.map((item, idx) => (
              <li key={idx} role="none" className="pill-col">
                <a
                  role="menuitem"
                  href={item.href}
                  aria-label={item.ariaLabel || item.label}
                  className="pill-link"
                  style={{
                    '--item-rot': `${item.rotation ?? 0}deg`,
                    '--pill-bg': menuBg,
                    '--pill-color': menuContentColor,
                    '--hover-bg': item.hoverStyles?.bgColor || '#f3f4f6',
                    '--hover-color': item.hoverStyles?.textColor || menuContentColor,
                    '--item-scale': 1,
                    '--item-opacity': 1,
                    '--label-offset': '0px',
                    '--label-opacity': 1,
                  }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="pill-label">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
