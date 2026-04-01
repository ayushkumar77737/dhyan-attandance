import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்',      flag: '🇮🇳' },
  { code: 'kn', label: 'ಕನ್ನಡ',      flag: '🇮🇳' }, 
  { code: 'ml', label: 'മലയാളം',     flag: '🇮🇳' }, 
  { code: 'bn', label: 'বাংলা',      flag: '🇧🇩' },
  { code: 'mr', label: 'मराठी',      flag: '🇮🇳' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = languages.find(l => l.code === i18n.language) || languages[0];

  // ← Close dropdown when clicking anywhere outside
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
    <div className="lang-wrapper" ref={ref}> {/* ← removed onMouseLeave */}

      {/* TRIGGER BUTTON */}
      <div className="lang-trigger" onClick={() => setOpen(!open)}>
        <span className="lang-flag">{current.flag}</span>
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
              <span className="lang-option-flag">{lang.flag}</span>
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