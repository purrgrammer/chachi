# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

chachi is a mobile-friendly Progressive Web Application (PWA) for Nostr group chat. It's a decentralized social application built on the Nostr protocol with Bitcoin/Lightning Network integration for payments and tipping.

## Development Commands

### Core Development
- `npm run dev` - Start Vite development server
- `npm run build` - TypeScript compilation + Vite production build  
- `npm run lint` - Run ESLint code linting
- `npm run preview` - Preview production build locally

### Notes on Testing
**No testing framework is currently configured.** The project lacks Jest, Vitest, or any test files. This is an area for potential improvement.

## Technology Stack & Architecture

### Core Framework
- **React 18.3.1** with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS** with custom theming
- **PWA** capabilities via vite-plugin-pwa

### State Management
- **Jotai** for atomic state management
- **TanStack Query** for server state management  
- **Dexie** with React hooks for IndexedDB storage

### Nostr Protocol Integration
- **@nostr-dev-kit/ndk** (NDK) as primary Nostr SDK
- **nostr-tools** for additional utilities
- Implements 20+ NIPs (see README.md for complete list)
- Multi-relay support with relay discovery

### Bitcoin/Lightning Features
- **Cashu** integration for ecash payments
- **WebLN** for Lightning Network payments
- **NWC (Nostr Wallet Connect)** support
- **Zap** functionality for Bitcoin tipping

### UI Components
- **shadcn/ui** component system built on **Radix UI**
- **Lucide React** for icons
- **Framer Motion** for animations
- **Sonner** for toast notifications

## Key Architecture Concepts

### Directory Structure
```
src/
├── app/           # App-level configuration and providers
├── components/    # React components
│   ├── nostr/    # Nostr protocol-specific components
│   ├── settings/ # Settings and preferences
│   └── ui/       # shadcn/ui reusable components
├── hooks/        # Custom React hooks
├── lib/          # Utility libraries and services
│   ├── nostr/   # Nostr protocol utilities
│   └── relay/   # Relay management logic
├── pages/        # Route components/pages
└── types/        # TypeScript type definitions
```

### Path Aliases
- `@/` points to `src/` directory (configured in vite.config.ts)

### Nostr Protocol Implementation
- Events are cached locally using Dexie (IndexedDB)
- Multi-relay architecture with connection pooling
- Supports both public and private group messaging
- Implements relay-based groups (NIP-29) and direct messages (NIP-17)

### PWA Configuration
- Auto-updating service worker
- 3MB cache limit for files
- Favicon-based icons with purple theme (#7c3aed)

### Mobile-First Design
- Touch-friendly interfaces
- Responsive layouts
- Optimized for bandwidth efficiency
- Offline capabilities

## Important Implementation Details

### State Management Patterns
- Use Jotai atoms for local state
- TanStack Query for server/relay state
- Dexie for persistent storage and caching

### Component Patterns
- shadcn/ui components are in `src/components/ui/`
- Nostr-specific components are organized in `src/components/nostr/`
- Use Radix UI primitives for accessibility

### Styling Conventions
- Tailwind CSS with custom theme colors
- Dark mode support via next-themes
- Mobile-responsive design patterns

### Internationalization
- Uses i18next with 30+ supported languages
- Translation files located in `public/locales/`

### Development Best Practices
- Make sure you add translations to the canonical public/languages/en/common.json file