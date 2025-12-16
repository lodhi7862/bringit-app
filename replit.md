# BringIt - Mobile Application

## Overview

BringIt is a React Native mobile application built with Expo for family coordination around grocery shopping and errands. The app enables parents to create visual shopping orders and delegate them to children/young adults. The core philosophy is "visual first" - prioritizing photos over text for item identification.

**Key Features:**
- Local-first user identity (no cloud accounts)
- QR code-based family member connections
- Visual item catalog with reusable saved items
- Order creation, tracking, and completion workflow
- Offline-capable architecture

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture (React Native + Expo)

**Navigation Pattern:** Tab-based navigation with 4 main tabs plus a floating action button for order creation.
- Tabs: Saved Items, Orders, History, Family
- Stack navigation within each tab for detail screens
- Modal presentation for profile setup and QR code flows

**State Management:** Custom local store (`client/lib/store.ts`) with subscription pattern for reactive updates. No Redux or external state library - uses simple observer pattern.

**Component Structure:**
- Themed components (`ThemedView`, `ThemedText`) for consistent dark/light mode support
- Reusable UI primitives (`Button`, `Card`, `Spacer`) with animation support via Reanimated
- Platform-specific keyboard handling with `KeyboardAwareScrollViewCompat`

**Styling Approach:** Centralized theme constants (`client/constants/theme.ts`) with spacing, border radius, colors, and typography tokens. Components use StyleSheet.create with theme injection via `useTheme` hook.

### Backend Architecture (Express + PostgreSQL)

**Server:** Express.js server with TypeScript, serving as API backend and static file host for web builds.

**Database:** PostgreSQL with Drizzle ORM for schema management and type-safe queries. Schema defined in `shared/schema.ts` with Zod validation via `drizzle-zod`.

**Storage Layer:** Abstracted storage interface (`server/storage.ts`) with in-memory implementation. Designed for easy swap to database-backed storage.

**API Pattern:** RESTful routes registered in `server/routes.ts`, all prefixed with `/api`.

### Data Flow

1. Client uses TanStack Query for server state management
2. API requests go through `client/lib/query-client.ts` with automatic URL resolution
3. Server routes handle business logic and delegate to storage layer
4. Drizzle ORM manages database operations with type safety

### Authentication Design

**Local Identity Only:** No traditional authentication. Users create local profiles with:
- Name (required)
- Optional profile photo
- Auto-generated local user ID
- QR code for family member connections

Family connections established via QR code scanning rather than account-based auth.

## External Dependencies

### Core Framework
- **Expo SDK 54:** Mobile development platform with managed workflow
- **React Native 0.81:** Cross-platform UI framework
- **React Navigation 7:** Navigation library with native stack and bottom tabs

### Database & API
- **PostgreSQL:** Primary database (configured via `DATABASE_URL` environment variable)
- **Drizzle ORM:** Type-safe SQL query builder and schema management
- **Express 4:** HTTP server framework

### UI & Animation
- **React Native Reanimated:** Gesture-based animations
- **React Native Gesture Handler:** Touch gesture system
- **Expo Image Picker:** Camera/gallery access for profile photos
- **Expo Haptics:** Tactile feedback on native platforms
- **Expo Blur/Glass Effect:** Visual effects for headers

### State & Data
- **TanStack Query:** Server state management and caching
- **Zod:** Runtime type validation

### Development
- **TypeScript:** Type safety across client and server
- **tsx:** TypeScript execution for development server
- **Drizzle Kit:** Database migration tooling