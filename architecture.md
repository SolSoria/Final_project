# NeuroScopeQ Architecture Documentation

## System Architecture Overview

NeuroScopeQ is a full-stack web application designed for real-time EEG clinical monitoring. The architecture follows a modern client-server pattern with clear separation of concerns, real-time capabilities, and clinical data management.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Databases     │
│   (React)       │◄──►│   (Express)     │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Components  │ │    │ │ API Routes  │ │    │ │ Simulation  │ │
│ │ State Mgmt  │ │    │ │ ML Service  │ │    │ │ Live Data   │ │
│ │ Charts      │ │    │ │ PDF Gen     │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ External Systems│
                    │                 │
                    │ ┌─────────────┐ │
                    │ │ LSL Gateway │ │
                    │ │ TUH Data    │ │
                    │ └─────────────┘ │
                    └─────────────────┘
```

## Frontend Architecture

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for HMR and optimized builds
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: 
  - Zustand for client-side UI state
  - React Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation

### Component Architecture

```
client/src/
├── components/
│   ├── ui/                    # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   ├── forms/                 # Form components
│   │   ├── patient-form.tsx
│   │   └── profile-form.tsx
│   ├── charts/                # Chart components
│   │   ├── trend-chart.tsx
│   │   ├── severity-chart.tsx
│   │   └── heatmap.tsx
│   ├── layout/                # Layout components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   └── clinical/              # Domain-specific components
│       ├── metric-card.tsx
│       ├── patient-badge.tsx
│       └── session-timeline.tsx
├── hooks/                     # Custom React hooks
│   ├── use-patients.ts
│   ├── use-sessions.ts
│   ├── use-realtime-data.ts
│   └── use-environment.ts
├── stores/                    # Zustand stores
│   ├── ui-store.ts
│   ├── patient-store.ts
│   └── session-store.ts
└── lib/                       # Utility libraries
    ├── api.ts                 # API client
    ├── validations.ts         # Zod schemas
    └── utils.ts               # Helper functions
```

### State Management Strategy

#### Client State (Zustand)
- **UI Store**: Loading states, modals, toasts, theme
- **Patient Store**: Current patient selection, filters
- **Session Store**: Active session, recording state

#### Server State (React Query)
- **Patients**: Cached patient lists and details
- **Sessions**: Historical session data
- **Real-time Data**: Live EEG metrics with refetching
- **Reports**: Generated report data

### Data Flow

```
User Action → Component → Hook → Store/Query → API → Backend
     ↓
UI Update ← Component ← Store/Query ← API Response
```

## Backend Architecture

### Technology Stack
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Server-Sent Events (SSE)
- **ML**: Random Forest model integration
- **PDF Generation**: Custom HTML-to-PDF pipeline

### Server Structure

```
server/
├── index.ts                  # Main Express app
├── routes/
│   ├── patients.ts          # Patient management routes
│   ├── sessions.ts          # Session data routes
│   ├── realtime.ts          # Real-time data routes
│   ├── reports.ts           # PDF generation routes
│   └── health.ts            # Health check routes
├── services/
│   ├── patient-service.ts   # Patient business logic
│   ├── session-service.ts   # Session management
│   ├── realtime-service.ts  # Real-time data processing
│   ├── ml-service.ts        # Machine learning integration
│   └── pdf-service.ts       # PDF generation
├── ml/
│   ├── randomForest.ts      # Random Forest implementation
│   ├── model-training.ts    # Model training utilities
│   └── predictions.ts       # Prediction logic
├── pdf/
│   ├── clinical-report.ts   # PDF template generation
│   ├── templates/           # HTML templates
│   └── styles/              # PDF CSS styles
├── db/
│   ├── connection.ts        # Database connection
│   ├── models/              # Mongoose models
│   └── migrations/          # Database migrations
└── middleware/
    ├── auth.ts              # Authentication middleware
    ├── validation.ts        # Request validation
    └── error-handling.ts    # Error handling
```

### API Design Principles

#### RESTful Endpoints
- **Resource-based URLs**: `/api/patients`, `/api/sessions`
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Status Codes**: Proper HTTP status codes
- **JSON Responses**: Consistent JSON response format

#### Real-time Communication
- **Server-Sent Events**: For real-time data streams
- **Event Types**: `dataUpdate`, `recordingComplete`, `alert`
- **Connection Management**: Automatic reconnection, heartbeat

#### Request/Response Format

```typescript
// Standard Response Format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Example: Patient Response
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    "age": 45,
    "cohort": "ADULT",
    "setting": "ICU"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Database Architecture

### Database Strategy
- **Multi-Database Setup**: Separate databases for different environments
- **Simulation Database**: `neuroscopeq_sim` - Synthetic TUH-like cases
- **Live Database**: `neuroscopeq_live` - Real patient data and recordings
- **Data Isolation**: Complete separation between simulation and live data

### Data Models

#### Patients Collection
```typescript
interface Patient {
  _id: string;
  name: string;
  age: number;
  sex: 'M' | 'F' | 'X';
  cohort: 'PEDS' | 'ADULT' | 'GERIATRIC';
  setting: 'AMBULATORY' | 'WARD' | 'ICU';
  bed: string;
  conditions: Condition[];
  medications: Medication[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Sessions Collection
```typescript
interface Session {
  _id: string;
  patientId: string;
  date: Date;
  duration: number; // minutes
  metrics: SessionMetrics;
  events: ClinicalEvent[];
  quality: QualityMetrics;
  createdAt: Date;
}
```

#### RealtimeSamples Collection
```typescript
interface RealtimeSample {
  _id: string;
  patientId: string;
  sessionId: string;
  timestamp: Date;
  metrics: RealtimeMetrics;
  artifacts: ArtifactAnalysis;
  patterns: PatternDetection[];
}
```

#### MLPredictions Collection
```typescript
interface MLPrediction {
  _id: string;
  patientId: string;
  sessionId: string;
  timestamp: Date;
  model: string;
  prediction: {
    encephalopathyScore: number;
    confidence: number;
    features: string[];
  };
}
```

### Indexing Strategy
- **Patient Queries**: Index on `cohort`, `setting`, `name`
- **Session Queries**: Index on `patientId`, `date`
- **Real-time Queries**: Index on `patientId`, `timestamp`
- **ML Queries**: Index on `patientId`, `sessionId`, `model`

## Integration Architecture

### External System Integrations

#### LSL Gateway Integration
```typescript
// LSL Stream Handler
class LSLStreamHandler {
  private streams: Map<string, LSLStream> = new Map();
  
  async connect(streamName: string): Promise<void> {
    const stream = await LSL.resolve_stream('name', streamName);
    this.streams.set(streamName, stream);
  }
  
  async readData(streamName: string): Promise<EEGData> {
    const stream = this.streams.get(streamName);
    const sample = await stream.pull_sample();
    return this.transformSample(sample);
  }
}
```

#### TUH Data Integration
```typescript
// TUH Data Processor
class TUHDataProcessor {
  async loadCase(caseId: string): Promise<TUHCase> {
    const edfFile = await this.loadEDF(caseId);
    const annotations = await this.loadAnnotations(caseId);
    return this.transformToSession(edfFile, annotations);
  }
  
  private transformToSession(edf: EDFFile, annotations: Annotation[]): Session {
    // Transform TUH format to internal session format
  }
}
```

### Machine Learning Integration

#### Random Forest Model
```typescript
// ML Service Architecture
class MLService {
  private model: RandomForestModel;
  
  async initialize(): Promise<void> {
    this.model = await RandomForestModel.load('model.json');
  }
  
  async predictEEGMetrics(eegData: EEGData): Promise<MLPrediction> {
    const features = this.extractFeatures(eegData);
    const prediction = this.model.predict(features);
    return this.formatPrediction(prediction);
  }
  
  private extractFeatures(data: EEGData): number[] {
    // Feature extraction: delta power, theta power, etc.
  }
}
```

## Security Architecture

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **Role-based Access**: Different access levels for clinicians, researchers
- **Session Management**: Token expiration and refresh

### Data Security
- **Encryption**: Data encryption in transit and at rest
- **HIPAA Compliance**: PHI handling and audit trails
- **Access Controls**: Patient data access logging

### API Security
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Zod schema validation for all inputs
- **CORS**: Proper cross-origin resource sharing configuration

## Performance Architecture

### Frontend Performance
- **Code Splitting**: Route-based and component-based splitting
- **Lazy Loading**: Components and charts loaded on demand
- **Caching**: React Query caching with stale-while-revalidate
- **Optimization**: Vite build optimizations and tree shaking

### Backend Performance
- **Database Optimization**: Indexing, query optimization, connection pooling
- **Caching Strategy**: Redis for frequently accessed data
- **Real-time Optimization**: Efficient SSE connections and data batching
- **Load Balancing**: Horizontal scaling capability

### Monitoring & Observability
- **Logging**: Structured logging with Winston
- **Metrics**: Performance and health metrics
- **Error Tracking**: Error aggregation and alerting
- **APM**: Application performance monitoring

## Deployment Architecture

### Environment Configuration
```typescript
// Environment-specific configuration
interface Config {
  nodeEnv: 'development' | 'production';
  port: number;
  database: {
    simulation: string;
    live: string;
  };
  ml: {
    modelPath: string;
    confidenceThreshold: number;
  };
  lsl: {
    enabled: boolean;
    gatewayUrl: string;
  };
}
```

### Deployment Strategies
- **Containerization**: Docker containers for consistent deployment
- **Orchestration**: Kubernetes for scaling and management
- **CI/CD**: Automated testing and deployment pipelines
- **Infrastructure as Code**: Terraform for infrastructure management

### Scalability Considerations
- **Horizontal Scaling**: Multiple server instances
- **Database Scaling**: Read replicas and sharding
- **Load Balancing**: Traffic distribution across instances
- **Auto-scaling**: Dynamic resource allocation based on load

## Future Architecture Enhancements

### Planned Improvements
1. **Microservices Transition**: Break down monolithic backend
2. **Event-Driven Architecture**: Implement event sourcing
3. **Advanced ML Models**: Deep learning models for EEG analysis
4. **Mobile Application**: React Native mobile app
5. **Cloud-Native Architecture**: Full cloud migration

### Technical Debt Items
1. **Database Migration**: Migrate from MongoDB to PostgreSQL
2. **API Versioning**: Implement proper API versioning
3. **Testing Coverage**: Increase unit and integration test coverage
4. **Documentation**: Improve API and architecture documentation
5. **Performance Optimization**: Optimize real-time data processing

---

This architecture documentation provides a comprehensive overview of the NeuroScopeQ system design, serving as a guide for developers, system administrators, and stakeholders involved in the project.
