import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇲🇽' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 处理语言代码，支持 'en-US' -> 'en' 的匹配
  const normalizedLang = i18n.language?.split('-')[0] || 'en';
  const currentLanguage = languages.find((lang) => lang.code === normalizedLang) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus the active language when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const activeIndex = languages.findIndex((l) => l.code === normalizedLang);
      setFocusedIndex(activeIndex >= 0 ? activeIndex : 0);
      requestAnimationFrame(() => {
        optionRefs.current[activeIndex >= 0 ? activeIndex : 0]?.focus();
      });
    }
  }, [isOpen, normalizedLang]);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    setIsOpen(false);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = (focusedIndex + 1) % languages.length;
          setFocusedIndex(nextIndex);
          optionRefs.current[nextIndex]?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = (focusedIndex - 1 + languages.length) % languages.length;
          setFocusedIndex(prevIndex);
          optionRefs.current[prevIndex]?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          setFocusedIndex(0);
          optionRefs.current[0]?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          const lastIndex = languages.length - 1;
          setFocusedIndex(lastIndex);
          optionRefs.current[lastIndex]?.focus();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setIsOpen(false);
          break;
        }
      }
    },
    [isOpen, focusedIndex]
  );

  return (
    <div className="language-switcher" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        className="language-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="flag">{currentLanguage.flag}</span>
        <span className="lang-code">{currentLanguage.code.toUpperCase()}</span>
        <svg
          className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <ul className="language-dropdown" role="listbox">
          {languages.map((lang, index) => (
            <li key={lang.code}>
              <button
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                role="option"
                aria-selected={lang.code === normalizedLang}
                className={lang.code === normalizedLang ? 'active' : ''}
                onClick={() => changeLanguage(lang.code)}
                type="button"
                tabIndex={index === focusedIndex ? 0 : -1}
              >
                <span className="flag">{lang.flag}</span>
                <span className="lang-name">{lang.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageSwitcher;
