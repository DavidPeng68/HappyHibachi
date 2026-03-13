import React from 'react';

export type IconName =
  // Navigation
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'close'
  // Contact
  | 'phone'
  | 'sms'
  | 'email'
  | 'map-pin'
  | 'clock'
  // Status
  | 'check'
  | 'star'
  | 'star-filled'
  | 'trophy'
  | 'warning'
  | 'pending'
  | 'cancelled'
  // Features
  | 'calendar'
  | 'chef'
  | 'party'
  | 'sparkle'
  | 'fire'
  | 'gift'
  | 'camera'
  | 'clipboard'
  // Food
  | 'salad'
  | 'rice'
  | 'vegetable'
  | 'dumpling'
  | 'noodle'
  | 'steak'
  | 'plus'
  // Region
  | 'palm-tree'
  | 'cowboy'
  | 'wave'
  // Social
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  // People
  | 'users'
  | 'mobile'
  // Misc
  | 'money'
  | 'mask'
  | 'tag'
  | 'lightbulb';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}

const iconPaths: Record<IconName, React.ReactNode> = {
  'chevron-left': (
    <path
      d="M15 18L9 12L15 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'chevron-right': (
    <path
      d="M9 18L15 12L9 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'chevron-down': (
    <path
      d="M6 9L12 15L18 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  close: (
    <>
      <path
        d="M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 6L18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  phone: (
    <path
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  ),
  sms: (
    <path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  ),
  email: (
    <>
      <path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  'map-pin': (
    <>
      <path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  check: (
    <polyline
      points="20,6 9,17 4,12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  star: (
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  ),
  'star-filled': (
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill="currentColor"
    />
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M4 22h16" stroke="currentColor" strokeWidth="2" />
      <path
        d="M10 22V18a2 2 0 0 1-2-2V4h8v12a2 2 0 0 1-2 2v4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </>
  ),
  warning: (
    <>
      <path
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  pending: (
    <>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  cancelled: (
    <>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" />
      <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  calendar: (
    <>
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        ry="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  chef: (
    <>
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M5.5 7c0-2.5 1.5-4 3-4.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M18.5 7c0-2.5-1.5-4-3-4.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <path
        d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </>
  ),
  party: (
    <>
      <path d="M5.8 11.3L2 22l10.7-3.8" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M4 3h.01" stroke="currentColor" strokeWidth="2" />
      <path d="M22 8h.01" stroke="currentColor" strokeWidth="2" />
      <path d="M15 2h.01" stroke="currentColor" strokeWidth="2" />
      <path d="M22 20h.01" stroke="currentColor" strokeWidth="2" />
      <path d="M22 2L12.7 11.3" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3v18" stroke="currentColor" strokeWidth="2" />
      <path d="M18.5 7.5L5.5 16.5" stroke="currentColor" strokeWidth="2" />
      <path d="M5.5 7.5L18.5 16.5" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  fire: (
    <path
      d="M12 22c-4.97 0-9-2.69-9-6s2.03-5.69 3-7c.97 2.69 3.97 4 6 4s3-1.31 3-3c0-2-1.03-3-3-4 4 0 9 3.69 9 10s-4.03 6-9 6z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  ),
  gift: (
    <>
      <polyline points="20,12 20,22 4,22 4,12" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="2" y="7" width="20" height="5" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="12" y1="22" x2="12" y2="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </>
  ),
  camera: (
    <>
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  clipboard: (
    <>
      <path
        d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <rect
        x="8"
        y="2"
        width="8"
        height="4"
        rx="1"
        ry="1"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </>
  ),
  salad: (
    <>
      <circle cx="12" cy="14" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 6V2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 6c0-2 1.5-3 3-3s3 1 3 3" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  rice: (
    <>
      <path d="M6 20h12" stroke="currentColor" strokeWidth="2" />
      <path d="M4 14h16" stroke="currentColor" strokeWidth="2" />
      <path
        d="M4 14c0 3.3 2.7 6 6 6h4c3.3 0 6-2.7 6-6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path d="M12 4v4" stroke="currentColor" strokeWidth="2" />
      <path d="M8 6v2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 6v2" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  vegetable: (
    <>
      <path d="M12 22V12" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 12c-1.5-1.5-2-4 0-6s4.5-1.5 5-1"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M17 12c1.5-1.5 2-4 0-6s-4.5-1.5-5-1"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </>
  ),
  dumpling: (
    <>
      <ellipse cx="12" cy="14" rx="9" ry="6" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M3 14c3-2 6-2 9-2s6 0 9 2" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  noodle: (
    <>
      <path d="M4 8c2 4 4 6 8 8" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M20 8c-2 4-4 6-8 8" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M8 4v4" stroke="currentColor" strokeWidth="2" />
      <path d="M12 4v4" stroke="currentColor" strokeWidth="2" />
      <path d="M16 4v4" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  steak: (
    <ellipse cx="12" cy="12" rx="9" ry="7" stroke="currentColor" strokeWidth="2" fill="none" />
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  'palm-tree': (
    <>
      <path d="M12 22V10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10c-3-4-8-3-10-1" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 10c3-4 8-3 10-1" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 10c-1-5-5-7-8-7" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 10c1-5 5-7 8-7" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  cowboy: (
    <>
      <ellipse cx="12" cy="14" rx="4" ry="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M2 17c2-3 5-5 10-5s8 2 10 5" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M8 11V7c0-2 2-4 4-4s4 2 4 4v4" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  wave: (
    <path
      d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0 4 3 6 0"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  ),
  instagram: (
    <>
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        ry="5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
    </>
  ),
  facebook: (
    <path
      d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  ),
  tiktok: (
    <>
      <path
        d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </>
  ),
  users: (
    <>
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  mobile: (
    <>
      <rect
        x="5"
        y="2"
        width="14"
        height="20"
        rx="2"
        ry="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <line x1="12" y1="18" x2="12.01" y2="18" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  money: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
      <path
        d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </>
  ),
  mask: (
    <>
      <path
        d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  tag: (
    <>
      <path
        d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9 18h6" stroke="currentColor" strokeWidth="2" />
      <path d="M10 22h4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </>
  ),
};

const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  className = '',
  'aria-hidden': ariaHidden = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`icon icon-${name} ${className}`}
      aria-hidden={ariaHidden}
    >
      {iconPaths[name]}
    </svg>
  );
};

export default Icon;
