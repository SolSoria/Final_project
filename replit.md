# NeuroScopeQ EEG Clinical Panel

## Overview

NeuroScopeQ is a real-time EEG clinical monitoring dashboard designed to make EEG data legible at the bedside and comparable across sessions. The application provides two main views: Current Status for real-time monitoring and Evolution for post-session trend analysis. It supports both simulation mode (replaying synthetic TUH-like cases) and live mode (reading real-time data from LSL Gateway). The system focuses on severity bands, quality gates, and clinical notes rather than raw spectrograms or traces.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **Styling**: TailwindCSS with shadcn/ui component library using the "new-york" style
- **State Management**: Zustand for UI state and React Query for server data caching and synchronization
- **Charts**: Recharts for data visualization including trend charts, stacked bars, and heatmaps
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express server framework
- **Language**: TypeScript with ES modules
- **Storage**: In-memory storage implementation (MemStorage) with interface for future database integration
- **API**: RESTful endpoints for patients, sessions, and real-time data
- **Development**: Vite middleware integration for hot reloading in development

### Database Design
- **Patients**: Demographics, cohort (PEDS/ADULT/GERIATRIC), setting (AMBULATORY/WARD/ICU), conditions, medications
- **Sessions**: Historical EEG data with metrics like encephalopathy score, delta percentage, ADR, SEF95, continuity patterns
- **Real-time Samples**: Live EEG snapshots with artifact percentage, reactivity, asymmetry, ACNS patterns, seizure burden

### Data Models
- **Schema Validation**: Zod schemas for type-safe data validation across client and server
- **Shared Types**: Common type definitions in `/shared` directory for consistency
- **Cohort-Specific Thresholds**: JSON configuration files for age-specific normal/borderline/abnormal ranges

### Component Architecture
- **UI Components**: Reusable shadcn/ui components (cards, buttons, tabs, switches, etc.)
- **Domain Components**: Specialized EEG components (MetricCard, TrendChart, ProfileDrawer, etc.)
- **Layout**: Responsive design with sticky header, tabbed interface, and slide-out patient profile drawer

### Configuration & Theming
- **Theme System**: CSS custom properties with light/dark mode support
- **Typography**: Inter font family with tabular numbers for metrics
- **Motion**: Subtle animations with reduced-motion support
- **Internationalization**: English copy configuration in JSON files

### Build & Development
- **Build Process**: Vite for frontend bundling, esbuild for server compilation
- **Development**: Hot reloading with Vite, TypeScript checking, ESLint/Prettier integration
- **Deployment**: Static frontend build with Node.js server for production

## External Dependencies

### Core Libraries
- **@tanstack/react-query**: Server state management and data fetching
- **zustand**: Client-side state management
- **drizzle-orm**: Database ORM with PostgreSQL dialect
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **recharts**: React charting library for data visualization

### UI Framework
- **@radix-ui/***: Comprehensive set of unstyled UI primitives (30+ components)
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant styling
- **lucide-react**: Icon library

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **wouter**: Lightweight routing
- **date-fns**: Date manipulation utilities

### Validation & Forms
- **zod**: Schema validation for type safety
- **@hookform/resolvers**: Form validation integration
- **react-hook-form**: Form state management

### Database & Storage
- **drizzle-kit**: Database migrations and schema management
- **connect-pg-simple**: PostgreSQL session store
- **drizzle-zod**: Integration between Drizzle ORM and Zod validation

### Optional ML Integration
- **Python Environment**: Optional machine learning model integration for encephalopathy scoring using Random Forest model trained on TUH-like data
- **LSL Gateway**: External service for live EEG data streaming (configurable endpoint)