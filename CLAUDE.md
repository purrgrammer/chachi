# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

chachi is a Nostr group chat client - a decentralized social application built as a PWA with React, TypeScript, and Vite. It implements extensive Nostr protocol support (29+ NIPs) with features like group chats, direct messages, Bitcoin/Lightning payments, and Cashu ecash integration.

## Development Commands

### Build and Development
- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production (runs TypeScript check + Vite build)
- `npm run lint` - Run ESLint checks
- `npm run preview` - Preview production build locally

### Key Notes
- Always run `npm run lint` after making changes to ensure code quality
- The build command includes TypeScript checking, so type errors will fail the build
- No testing framework is currently configured

## Architecture

### Tech Stack
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** + **Radix UI** components
- **Jotai** for state management
- **TanStack React Query** for server state
- **Dexie** (IndexedDB) for local storage
- **@nostr-dev-kit/ndk** for Nostr protocol integration

### Key Directories
- `src/components/` - React components
  - `ui/` - Base UI components (shadcn/ui)
  - `nostr/` - Nostr-specific components (events, profiles, groups)
  - `settings/` - Application settings
- `src/pages/` - Route-level page components  
- `src/lib/` - Utilities and business logic
  - `nostr/` - Nostr protocol implementations
  - `relay/` - Relay management
  - `hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `public/locales/` - i18n translation files (30+ languages)

### Nostr Protocol Integration
The app implements extensive Nostr protocol support including:
- **NIP-29** (Relay-based groups) - Core group functionality
- **NIP-17** (Private Direct Messages) - End-to-end encrypted DMs
- **NIP-57** (Zaps) + **NIP-61** (Nut Zaps) - Bitcoin/Cashu payments
- **Content types**: NIP-23 (long-form), NIP-71 (video), NIP-C0 (code snippets)

### State Management Pattern
- **Jotai atoms** for global application state
- **React Query** for Nostr event fetching and caching
- **Dexie** for persistent local storage of events and user data
- **NDK** manages Nostr relay connections and event publishing

## Coding Guidelines

### From .cursorrules
- Use **early returns** for better readability
- Always use **Tailwind classes** for styling (avoid inline CSS)
- Use **descriptive names** with "handle" prefix for event handlers
- Implement **accessibility features** (tabindex, aria-label, etc.)
- Use **const arrow functions** instead of function declarations
- Define **TypeScript types** where possible

### Component Patterns
- Follow existing component structure in `src/components/ui/`
- Use **shadcn/ui** components as base building blocks
- Leverage **Radix UI** primitives for complex interactions
- Follow **React Query** patterns for data fetching
- Use **Jotai** atoms for shared state

### Nostr Development
- Use **NDK** for all Nostr operations (events, relays, users)
- Events are cached locally via **Dexie** - check existing data first
- Follow **NIP specifications** when implementing new Nostr features
- Test with multiple relays as users may connect to different relay sets

### Internationalization
- All user-facing text must support i18n via **react-i18next**
- Translation keys follow namespace pattern (e.g., `t('chat.sendMessage')`)
- New features require translation key additions

### Mobile-First Development
- Design mobile-first with responsive breakpoints
- Use **Tailwind responsive prefixes** (sm:, md:, lg:)
- Test touch interactions and gesture support
- Consider bandwidth efficiency for mobile users