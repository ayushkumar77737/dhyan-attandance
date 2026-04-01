import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'hi', label: '🇮🇳 हिंदी' },
  { code: 'te', label: '🇮🇳 తెలుగు' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (e) => {
    const selectedLang = e.target.value;
    i18n.changeLanguage(selectedLang);
    localStorage.setItem('appLanguage', selectedLang); // ← Saves to localStorage
  };

  return (
    <select
      value={i18n.language}
      onChange={handleChange}
      style={{
        padding: '6px 10px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        cursor: 'pointer',
        fontSize: '14px',
        backgroundColor: '#1e1e2e',
        color: '#fff',
      }}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}