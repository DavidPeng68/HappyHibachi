/// <reference types="react-scripts" />

// Image module declarations
declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  const src: string;
  export default src;
}

// Environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_PHONE?: string;
    REACT_APP_EMAIL?: string;
    REACT_APP_RESPONSE_TIME?: string;
    REACT_APP_HOURS_AFTERNOON?: string;
    REACT_APP_HOURS_EVENING?: string;
    REACT_APP_HOURS_NIGHT?: string;
    REACT_APP_PRICE_PER_PERSON?: string;
    REACT_APP_MINIMUM_ORDER?: string;
    REACT_APP_KIDS_PRICE?: string;
    REACT_APP_ENABLE_ADMIN?: string;
    REACT_APP_API_BASE_URL?: string;
    REACT_APP_GA_TRACKING_ID?: string;
  }
}
