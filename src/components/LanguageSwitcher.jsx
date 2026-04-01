import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const languages = [
  { code: 'en', label: 'English',  short: 'EN' },
  { code: 'hi', label: 'हिंदी',    short: 'HI' },
  { code: 'te', label: 'తెలుగు',   short: 'TE' },
  { code: 'ta', label: 'தமிழ்',    short: 'TA' },
  { code: 'kn', label: 'ಕನ್ನಡ',    short: 'KN' },
  { code: 'ml', label: 'മലയാളം',   short: 'ML' },
  { code: 'bn', label: 'বাংলা',    short: 'BN' },
  { code: 'mr', label: 'मराठी',    short: 'MR' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = languages.find(l => l.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('appLanguage', code);
    setOpen(false);
  };

  return (
    <div className="lang-wrapper" ref={ref}>

      {/* TRIGGER BUTTON */}
      <div className="lang-trigger" onClick={() => setOpen(!open)}>
        <span className="lang-badge">{current.short}</span>  {/* ← badge instead of flag */}
        <span className="lang-label">{current.label}</span>
        <span className={`lang-arrow ${open ? 'open' : ''}`}>▾</span>
      </div>

      {/* DROPDOWN MENU */}
      {open && (
        <div className="lang-dropdown">
          {languages.map((lang) => (
            <div
              key={lang.code}
              className={`lang-option ${lang.code === i18n.language ? 'active' : ''}`}
              onClick={() => handleSelect(lang.code)}
            >
              <span className="lang-option-badge">{lang.short}</span>  {/* ← badge instead of flag */}
              <span className="lang-option-label">{lang.label}</span>
              {lang.code === i18n.language && (
                <span className="lang-check">✓</span>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}