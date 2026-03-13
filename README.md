# Family Friends Hibachi 🍖

At Home Hibachi Experience - Professional hibachi catering service for California, Texas, and Florida.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/family-friends-hibachi.git
cd family-friends-hibachi

# Install dependencies
npm install

# Start development server
npm start
```

The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/          # Shared components (ErrorBoundary, SEO, etc.)
│   ├── Navigation/
│   ├── Hero/
│   ├── Gallery/
│   └── ...
├── pages/               # Page components
│   ├── HomePage.tsx
│   ├── FreeEstimate.tsx
│   ├── BookNow.tsx
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useNavigation.ts
│   └── useSlider.ts
├── constants/           # Application constants and configuration
├── types/               # TypeScript type definitions
├── images/              # Static images
├── App.tsx              # Main application component
└── index.tsx            # Application entry point
```

## 🛠 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
# Contact Information
REACT_APP_PHONE=909-615-6633
REACT_APP_EMAIL=familyfriendshibachi@gmail.com
REACT_APP_RESPONSE_TIME=2 hours

# Business Hours
REACT_APP_HOURS_AFTERNOON=1:00 PM - 3:00 PM
REACT_APP_HOURS_EVENING=4:00 PM - 6:00 PM
REACT_APP_HOURS_NIGHT=7:00 PM - 9:00 PM

# Pricing
REACT_APP_PRICE_PER_PERSON=60
REACT_APP_MINIMUM_ORDER=600
REACT_APP_KIDS_PRICE=30

# Feature Flags
REACT_APP_ENABLE_ADMIN=false
```

## 🏗 Tech Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **SEO**: react-helmet-async
- **Styling**: CSS Modules
- **Code Quality**: ESLint + Prettier
- **Build Tool**: Create React App

## 📱 Features

- ✅ Responsive design (mobile-first)
- ✅ SEO optimized with meta tags
- ✅ Accessible (ARIA labels, semantic HTML)
- ✅ Type-safe with TypeScript
- ✅ Environment-based configuration
- ✅ Error boundaries for graceful error handling
- ✅ Route protection for admin pages

## 🎨 Key Components

### Pages
- **HomePage**: Landing page with all main sections
- **FreeEstimate**: Quote request form
- **BookNow**: Full booking flow with region selection
- **AdminDashboard**: Protected admin interface (disabled by default)

### Reusable Components
- **Navigation**: Fixed header with responsive menu
- **Hero**: Landing section with CTAs
- **Gallery**: Image carousel with lazy loading
- **CustomerReviews**: Testimonials slider
- **FAQ**: Accordion-style FAQ section
- **Contact**: Contact information and CTAs

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `build/` directory.

### Deploy to Netlify

The project includes a `_redirects` file for SPA routing on Netlify.

### Environment Variables in Production

Make sure to set all `REACT_APP_*` environment variables in your hosting provider's settings.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Contact

- **Phone**: 909-615-6633
- **Email**: familyfriendshibachi@gmail.com
- **Service Areas**: California, Texas, Florida


## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/family-friends-hibachi.git
cd family-friends-hibachi

# Install dependencies
npm install

# Start development server
npm start
```

The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/          # Shared components (ErrorBoundary, SEO, etc.)
│   ├── Navigation/
│   ├── Hero/
│   ├── Gallery/
│   └── ...
├── pages/               # Page components
│   ├── HomePage.tsx
│   ├── FreeEstimate.tsx
│   ├── BookNow.tsx
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useNavigation.ts
│   └── useSlider.ts
├── constants/           # Application constants and configuration
├── types/               # TypeScript type definitions
├── images/              # Static images
├── App.tsx              # Main application component
└── index.tsx            # Application entry point
```

## 🛠 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
# Contact Information
REACT_APP_PHONE=909-615-6633
REACT_APP_EMAIL=familyfriendshibachi@gmail.com
REACT_APP_RESPONSE_TIME=2 hours

# Business Hours
REACT_APP_HOURS_AFTERNOON=1:00 PM - 3:00 PM
REACT_APP_HOURS_EVENING=4:00 PM - 6:00 PM
REACT_APP_HOURS_NIGHT=7:00 PM - 9:00 PM

# Pricing
REACT_APP_PRICE_PER_PERSON=60
REACT_APP_MINIMUM_ORDER=600
REACT_APP_KIDS_PRICE=30

# Feature Flags
REACT_APP_ENABLE_ADMIN=false
```

## 🏗 Tech Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **SEO**: react-helmet-async
- **Styling**: CSS Modules
- **Code Quality**: ESLint + Prettier
- **Build Tool**: Create React App

## 📱 Features

- ✅ Responsive design (mobile-first)
- ✅ SEO optimized with meta tags
- ✅ Accessible (ARIA labels, semantic HTML)
- ✅ Type-safe with TypeScript
- ✅ Environment-based configuration
- ✅ Error boundaries for graceful error handling
- ✅ Route protection for admin pages

## 🎨 Key Components

### Pages
- **HomePage**: Landing page with all main sections
- **FreeEstimate**: Quote request form
- **BookNow**: Full booking flow with region selection
- **AdminDashboard**: Protected admin interface (disabled by default)

### Reusable Components
- **Navigation**: Fixed header with responsive menu
- **Hero**: Landing section with CTAs
- **Gallery**: Image carousel with lazy loading
- **CustomerReviews**: Testimonials slider
- **FAQ**: Accordion-style FAQ section
- **Contact**: Contact information and CTAs

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `build/` directory.

### Deploy to Netlify

The project includes a `_redirects` file for SPA routing on Netlify.

### Environment Variables in Production

Make sure to set all `REACT_APP_*` environment variables in your hosting provider's settings.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Contact

- **Phone**: 909-615-6633
- **Email**: familyfriendshibachi@gmail.com
- **Service Areas**: California, Texas, Florida


## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/family-friends-hibachi.git
cd family-friends-hibachi

# Install dependencies
npm install

# Start development server
npm start
```

The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/          # Shared components (ErrorBoundary, SEO, etc.)
│   ├── Navigation/
│   ├── Hero/
│   ├── Gallery/
│   └── ...
├── pages/               # Page components
│   ├── HomePage.tsx
│   ├── FreeEstimate.tsx
│   ├── BookNow.tsx
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useNavigation.ts
│   └── useSlider.ts
├── constants/           # Application constants and configuration
├── types/               # TypeScript type definitions
├── images/              # Static images
├── App.tsx              # Main application component
└── index.tsx            # Application entry point
```

## 🛠 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
# Contact Information
REACT_APP_PHONE=909-615-6633
REACT_APP_EMAIL=familyfriendshibachi@gmail.com
REACT_APP_RESPONSE_TIME=2 hours

# Business Hours
REACT_APP_HOURS_AFTERNOON=1:00 PM - 3:00 PM
REACT_APP_HOURS_EVENING=4:00 PM - 6:00 PM
REACT_APP_HOURS_NIGHT=7:00 PM - 9:00 PM

# Pricing
REACT_APP_PRICE_PER_PERSON=60
REACT_APP_MINIMUM_ORDER=600
REACT_APP_KIDS_PRICE=30

# Feature Flags
REACT_APP_ENABLE_ADMIN=false
```

## 🏗 Tech Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **SEO**: react-helmet-async
- **Styling**: CSS Modules
- **Code Quality**: ESLint + Prettier
- **Build Tool**: Create React App

## 📱 Features

- ✅ Responsive design (mobile-first)
- ✅ SEO optimized with meta tags
- ✅ Accessible (ARIA labels, semantic HTML)
- ✅ Type-safe with TypeScript
- ✅ Environment-based configuration
- ✅ Error boundaries for graceful error handling
- ✅ Route protection for admin pages

## 🎨 Key Components

### Pages
- **HomePage**: Landing page with all main sections
- **FreeEstimate**: Quote request form
- **BookNow**: Full booking flow with region selection
- **AdminDashboard**: Protected admin interface (disabled by default)

### Reusable Components
- **Navigation**: Fixed header with responsive menu
- **Hero**: Landing section with CTAs
- **Gallery**: Image carousel with lazy loading
- **CustomerReviews**: Testimonials slider
- **FAQ**: Accordion-style FAQ section
- **Contact**: Contact information and CTAs

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `build/` directory.

### Deploy to Netlify

The project includes a `_redirects` file for SPA routing on Netlify.

### Environment Variables in Production

Make sure to set all `REACT_APP_*` environment variables in your hosting provider's settings.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Contact

- **Phone**: 909-615-6633
- **Email**: familyfriendshibachi@gmail.com
- **Service Areas**: California, Texas, Florida


## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/family-friends-hibachi.git
cd family-friends-hibachi

# Install dependencies
npm install

# Start development server
npm start
```

The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/          # Shared components (ErrorBoundary, SEO, etc.)
│   ├── Navigation/
│   ├── Hero/
│   ├── Gallery/
│   └── ...
├── pages/               # Page components
│   ├── HomePage.tsx
│   ├── FreeEstimate.tsx
│   ├── BookNow.tsx
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useNavigation.ts
│   └── useSlider.ts
├── constants/           # Application constants and configuration
├── types/               # TypeScript type definitions
├── images/              # Static images
├── App.tsx              # Main application component
└── index.tsx            # Application entry point
```

## 🛠 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
# Contact Information
REACT_APP_PHONE=909-615-6633
REACT_APP_EMAIL=familyfriendshibachi@gmail.com
REACT_APP_RESPONSE_TIME=2 hours

# Business Hours
REACT_APP_HOURS_AFTERNOON=1:00 PM - 3:00 PM
REACT_APP_HOURS_EVENING=4:00 PM - 6:00 PM
REACT_APP_HOURS_NIGHT=7:00 PM - 9:00 PM

# Pricing
REACT_APP_PRICE_PER_PERSON=60
REACT_APP_MINIMUM_ORDER=600
REACT_APP_KIDS_PRICE=30

# Feature Flags
REACT_APP_ENABLE_ADMIN=false
```

## 🏗 Tech Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **SEO**: react-helmet-async
- **Styling**: CSS Modules
- **Code Quality**: ESLint + Prettier
- **Build Tool**: Create React App

## 📱 Features

- ✅ Responsive design (mobile-first)
- ✅ SEO optimized with meta tags
- ✅ Accessible (ARIA labels, semantic HTML)
- ✅ Type-safe with TypeScript
- ✅ Environment-based configuration
- ✅ Error boundaries for graceful error handling
- ✅ Route protection for admin pages

## 🎨 Key Components

### Pages
- **HomePage**: Landing page with all main sections
- **FreeEstimate**: Quote request form
- **BookNow**: Full booking flow with region selection
- **AdminDashboard**: Protected admin interface (disabled by default)

### Reusable Components
- **Navigation**: Fixed header with responsive menu
- **Hero**: Landing section with CTAs
- **Gallery**: Image carousel with lazy loading
- **CustomerReviews**: Testimonials slider
- **FAQ**: Accordion-style FAQ section
- **Contact**: Contact information and CTAs

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `build/` directory.

### Deploy to Netlify

The project includes a `_redirects` file for SPA routing on Netlify.

### Environment Variables in Production

Make sure to set all `REACT_APP_*` environment variables in your hosting provider's settings.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Contact

- **Phone**: 909-615-6633
- **Email**: familyfriendshibachi@gmail.com
- **Service Areas**: California, Texas, Florida
