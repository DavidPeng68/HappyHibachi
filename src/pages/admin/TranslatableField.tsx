import React, { useState } from 'react';
import type { TranslatableText, LocaleCode } from '../../types/menu';
import './TranslatableField.css';

interface TranslatableFieldProps {
  value: TranslatableText;
  onChange: (value: TranslatableText) => void;
  mode?: 'input' | 'textarea';
  label?: string;
  placeholder?: string;
}

const LOCALES: { code: LocaleCode; label: string; required?: boolean }[] = [
  { code: 'en', label: 'EN', required: true },
  { code: 'zh', label: '中' },
  { code: 'es', label: 'ES' },
  { code: 'ko', label: 'KO' },
  { code: 'vi', label: 'VI' },
  { code: 'ja', label: 'JA' },
  { code: 'tl', label: 'TL' },
  { code: 'hi', label: 'HI' },
];

const TranslatableField: React.FC<TranslatableFieldProps> = ({
  value,
  onChange,
  mode = 'input',
  label,
  placeholder,
}) => {
  const [activeLocale, setActiveLocale] = useState<LocaleCode>('en');

  const handleTextChange = (text: string) => {
    const updated = { ...value };
    if (activeLocale === 'en') {
      updated.en = text;
    } else if (text.trim() === '') {
      delete updated[activeLocale];
    } else {
      updated[activeLocale] = text;
    }
    onChange(updated);
  };

  const currentValue = value[activeLocale] ?? '';
  const localeInfo = LOCALES.find((l) => l.code === activeLocale)!;
  const isRequired = localeInfo.required;
  const placeholderText = isRequired ? placeholder || '' : 'Leave empty to show English';

  return (
    <div className="translatable-field">
      {label && <label className="translatable-field__label">{label}</label>}

      <div className="translatable-field__tabs">
        {LOCALES.map((locale) => {
          const isFilled = locale.code !== 'en' && !!value[locale.code]?.trim();
          const isActive = locale.code === activeLocale;

          return (
            <button
              key={locale.code}
              type="button"
              className={[
                'translatable-field__tab',
                isActive && 'translatable-field__tab--active',
                isFilled && 'translatable-field__tab--filled',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setActiveLocale(locale.code)}
            >
              {locale.label}
              {locale.required && <span className="translatable-field__required">*</span>}
            </button>
          );
        })}
      </div>

      {mode === 'textarea' ? (
        <textarea
          className="translatable-field__textarea"
          value={currentValue}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={placeholderText}
          required={isRequired}
        />
      ) : (
        <input
          type="text"
          className="translatable-field__input"
          value={currentValue}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={placeholderText}
          required={isRequired}
        />
      )}
    </div>
  );
};

export default TranslatableField;
