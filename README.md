# NeuroScopeQ - EEG Clinical Monitoring Dashboard

## Overview

NeuroScopeQ is a real-time EEG clinical monitoring dashboard designed to make EEG data legible at the bedside and comparable across sessions. The application provides two main views: Current Status for real-time monitoring and Evolution for post-session trend analysis. It supports both simulation mode (replaying synthetic TUH-like cases) and live mode (reading real-time data from LSL Gateway).

## Features

### Core Functionality
- **Real-time EEG Monitoring**: Live EEG data visualization with severity bands and quality gates
- **Post-session Analysis**: Trend charts and comparative analysis across sessions
- **Enhanced ML Pipeline**: Advanced qEEG feature extraction with Random Forest modeling
- **Real-time Processing**: Sliding window analysis for continuous monitoring
- **Dual Mode Support**: 
  - Simulation mode with synthetic TUH-like cases
  - Live mode with LSL Gateway integration
- **Clinical Notes & Annotations**: Structured documentation support
- **PDF Report Generation**: Detailed clinical reports with interpretations

### User Interface
- **Environment Picker**: Choose between Simulation and Hardware environments
- **Patient Management**: Search, filter, and manage patient profiles
- **Real-time Dashboard**: Current status with live metrics and signal quality
- **Evolution Analysis**: Post-session charts with normal/abnormal indicators
- **Responsive Design**: Works across different screen sizes and devices

### ML Pipeline Features
- **qEEG Feature Extraction**: Comprehensive quantitative EEG analysis including spectral bands, continuity, reactivity, asymmetry, and seizure detection
- **Enhanced Random Forest**: Advanced ensemble learning for encephalopathy scoring with clinical interpretability
- **Artifact Detection**: Intelligent identification of blink, motion/EMG, and flatline artifacts with quality gating
- **Sliding Window Processing**: Real-time analysis with configurable window sizes and overlap for continuous monitoring
- **Cohort-Specific Thresholds**: Age and setting appropriate thresholds for PEDS, ADULT, and GERIATRIC populations
- **ACNS Pattern Detection**: Standardized American Clinical Neurophysiology Society pattern classification
- **Real-time Alerts**: Automated alerts for critical conditions like high artifact levels, severe encephalopathy, and seizure activity

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: TailwindCSS with shadcn/ui component library
- **State Management**: Zustand for UI state, React Query for server data
- **Charts**: Recharts for data visualization
- **Routing**: Wouter for lightweight client-side routing

### Backend
- **Runtime**: Node.js with Express server framework
- **Language**: TypeScript with ES modules
- **Database**: MongoDB (separate databases for simulation and live data)
- **API**: RESTful endpoints with real-time SSE support
- **ML Integration**: Random Forest model for EEG analysis

### Development Tools
- **Type Checking**: TypeScript with strict mode
- **Code Quality**: ESLint and Prettier
- **Database ORM**: Drizzle ORM with PostgreSQL schema
- **Validation**: Zod for type-safe data validation

## Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (for simulation and live databases)
- LSL Gateway (for live mode)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NeuroScope
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file
   cp .env.example .env
   
   # Edit with your configuration
   MONGODB_URI_SIM=mongodb://localhost:27017/neuroscopeq_sim
   MONGODB_URI_LIVE=mongodb://localhost:27017/neuroscopeq_live
   ```

4. **Set up database**
   ```bash
   # Run database migrations
   npm run db:push
   
   # Seed simulation data
   npm run seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## Project Structure

```
NeuroScope/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── config/         # Configuration files
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
│   └── index.html         # Main HTML file
├── server/                # Express backend
│   ├── ml/               # Enhanced ML Pipeline
│   │   ├── qEEGProcessor.ts     # qEEG interfaces and types
│   │   ├── qEEGFeatures.ts      # qEEG feature extraction
│   │   ├── preprocessing.ts     # Signal preprocessing pipeline
│   │   ├── artifactDetection.ts # Artifact detection system
│   │   ├── randomForest.ts      # Enhanced Random Forest model
│   │   ├── thresholdConfig.ts   # Cohort-specific thresholds
│   │   └── slidingWindowProcessor.ts # Real-time processing
│   ├── pdf/              # PDF generation utilities
│   ├── db.ts             # Database configuration
│   └── index.ts          # Main server file
├── shared/               # Shared types and schemas
│   └── schema.ts         # Zod schemas and Drizzle tables
├── scripts/              # Build and utility scripts
│   └── seed.ts           # Database seeding script
└── config files          # TypeScript, Vite, Tailwind configs
```

## Key Components

### Data Models
- **Patients**: Demographics, cohort, setting, conditions, medications
- **Sessions**: Historical EEG data with clinical metrics
- **Real-time Samples**: Live EEG snapshots with artifact analysis
- **ML Predictions**: Machine learning analysis results

### Clinical Metrics
- **Encephalopathy Score**: Overall brain function assessment (0-10 scale)
- **Spectral Analysis**: Delta, theta, alpha, beta, and gamma band power percentages
- **ADR**: Amplitude-integrated EEG ratio for background activity
- **SEF95**: Spectral edge frequency at 95% power distribution
- **Continuity Patterns**: Classification of continuous, discontinuous, burst-suppression, and suppressed patterns
- **Reactivity Assessment**: Stimulus response analysis for neurological function
- **Asymmetry Analysis**: Hemispheric power differences and lateralization
- **Seizure Detection**: Burden calculation and event identification
- **ACNS Patterns**: Standardized EEG pattern classification (PDs, RDA+, GRDA+, etc.)
- **Artifact Metrics**: Blink, motion/EMG, and flatline artifact percentages with quality assessment

### Cohort-Specific Features
- **Age Groups**: PEDS, ADULT, GERIATRIC
- **Settings**: AMBULATORY, WARD, ICU
- **Normal Ranges**: Age-specific thresholds for clinical metrics
- **Custom Visualizations**: Cohort-appropriate chart presentations

## API Endpoints

### Environment & Status
- `GET /api/status` - Environment and database status

### Patient Management
- `GET /api/patients` - List patients with search and filters
- `POST /api/patient` - Create or update patient profile
- `GET /api/patient/:id` - Get patient details

### Session Data
- `GET /api/sessions/:patientId` - Get patient sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id/metrics` - Get session metrics

### Real-time Data
- `GET /api/realtime/:patientId` - Get real-time EEG data
- `POST /api/recordings/start/:patientId` - Start recording session
- `GET /api/recordings/events/:patientId` - SSE for recording events

### Reports
- `GET /api/report/:patientId` - Generate PDF report
- `GET /api/report/:patientId/html` - Get report HTML

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type checking
- `npm run db:push` - Push database schema

### Code Style
- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for code formatting
- Write JSDoc comments for functions and classes

### Testing
- Component tests with React Testing Library
- API tests with Supertest
- End-to-end tests with Playwright (if configured)

## Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Configuration
- Set appropriate environment variables
- Configure MongoDB connections
- Set up LSL Gateway for live mode

### Docker Support
```bash
# Build image
docker build -t neuroscope .

# Run container
docker run -p 3000:3000 neuroscope
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in `/docs` folder

---

**NeuroScopeQ** - Making EEG data accessible and actionable for clinical decision-making.
