import React from 'react';

// All icons: 64x64, stroke-based, using currentColor for theme adaptation

export const NoDataIcon: React.FC = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="12" y="8" width="40" height="48" rx="4" />
    <line x1="22" y1="22" x2="42" y2="22" />
    <line x1="22" y1="30" x2="42" y2="30" />
    <line x1="22" y1="38" x2="34" y2="38" />
  </svg>
);

export const NoBookingsIcon: React.FC = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="8" y="12" width="48" height="44" rx="4" />
    <line x1="8" y1="24" x2="56" y2="24" />
    <line x1="20" y1="8" x2="20" y2="16" />
    <line x1="44" y1="8" x2="44" y2="16" />
    <circle cx="32" cy="40" r="8" strokeDasharray="4 3" />
  </svg>
);

export const NoResultsIcon: React.FC = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="28" cy="28" r="16" />
    <line x1="40" y1="40" x2="54" y2="54" />
    <line x1="22" y1="28" x2="34" y2="28" />
  </svg>
);

export const ErrorIcon: React.FC = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="32" cy="32" r="24" />
    <line x1="32" y1="20" x2="32" y2="36" />
    <circle cx="32" cy="44" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
