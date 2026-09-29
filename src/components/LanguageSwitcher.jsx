import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const languages = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिंदी', short: 'HI' },
  { code: 'te', label: 'తెలుగు', short: 'TE' },
  { code: 'ta', label: 'தமிழ்', short: 'TA' },
  { code: 'kn', label: 'ಕನ್ನಡ', short: 'KN' },
  { code: 'ml', label: 'മലയാളം', short: 'ML' },
  { code: 'bn', label: 'বাংলা', short: 'BN' },
  { code: 'mr', label: 'मराठी', short: 'MR' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // handles codes like "en-US" too
  const activeCode = (i18n.language || 'en').split('-')[0];
  const current = languages.find((l) => l.code === activeCode) || languages[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('appLanguage');
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  }, []);

  const handleSelect = (code) => {
    if (code !== activeCode) {
      i18n.changeLanguage(code);
      localStorage.setItem('appLanguage', code);
    }
    setOpen(false);
  };

  return (
    <div className="lang-wrapper" ref={ref}>
      <button
        type="button"
        className="lang-trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="lang-badge">{current.short}</span>
        <span className="lang-label">{current.label}</span>
        <span className={`lang-arrow ${open ? 'open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="lang-dropdown" role="listbox">
          {languages.map((lang) => (
            <div
              key={lang.code}
              role="option"
              tabIndex={0}
              aria-selected={lang.code === activeCode}
              className={`lang-option ${lang.code === activeCode ? 'active' : ''}`}
              onClick={() => handleSelect(lang.code)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(lang.code);
                }
              }}
            >
              <span className="lang-option-badge">{lang.short}</span>
              <span className="lang-option-label">{lang.label}</span>
              {lang.code === activeCode && <span className="lang-check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}