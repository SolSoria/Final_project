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
├── ml/                      # Enhanced ML Pipeline
│   ├── qEEGProcessor.ts     # qEEG interfaces and types
│   ├── qEEGFeatures.ts      # qEEG feature extraction
│   ├── preprocessing.ts     # Signal preprocessing pipeline
│   ├── artifactDetection.ts # Artifact detection system
│   ├── randomForest.ts      # Enhanced Random Forest model
│   ├── thresholdConfig.ts   # Cohort-specific thresholds
│   └── slidingWindowProcessor.ts # Real-time processing
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

#### Enhanced qEEG Feature Extraction Pipeline
```typescript
// qEEG Feature Extraction Architecture
class qEEGFeatureExtractor {
  private artifactDetector: ArtifactDetector;
  private spectralBands: SpectralBands;
  
  async extractFeatures(data: EEGData): Promise<qEEGFeatures> {
    // 1. Preprocessing: Band-pass, notch, CAR
    const preprocessed = await this.preprocessEEG(data);
    
    // 2. Artifact Detection: Blink, motion, flatline
    const artifacts = await this.artifactDetector.detectArtifacts(preprocessed);
    
    // 3. Spectral Analysis: Power spectral density
    const spectral = await this.analyzeSpectralBands(preprocessed);
    
    // 4. Continuity Analysis: Pattern classification
    const continuity = await this.analyzeContinuity(preprocessed);
    
    // 5. Reactivity Testing: Stimulus response
    const reactivity = await this.analyzeReactivity(preprocessed);
    
    // 6. Asymmetry Analysis: Hemispheric differences
    const asymmetry = await this.analyzeAsymmetry(preprocessed);
    
    // 7. Seizure Detection: Burden and events
    const seizure = await this.detectSeizureActivity(preprocessed);
    
    // 8. ACNS Pattern Detection: Standardized patterns
    const acnsPatterns = await this.detectACNSPatterns(preprocessed);
    
    return {
      spectral,
      continuity,
      reactivity,
      asymmetry,
      seizure,
      acnsPatterns,
      artifacts,
      encephalopathyScore: this.calculateEncephalopathyScore({
        spectral, continuity, reactivity, asymmetry, seizure, artifacts
      })
    };
  }
}
```

#### Enhanced Random Forest Model
```typescript
// Enhanced Random Forest for Encephalopathy Assessment
class EnhancedRandomForestModel {
  private trees: DecisionTree[];
  private thresholdConfig: ThresholdConfiguration;
  
  predict(features: qEEGFeatures): MLPrediction {
    // Extract ML features from qEEG features
    const mlFeatures: MLFeatures = {
      deltaPct: features.spectral.delta.power,
      thetaPct: features.spectral.theta.power,
      alphaPct: features.spectral.alpha.power,
      betaPct: features.spectral.beta.power,
      gammaPct: features.spectral.gamma.power,
      adr: features.spectral.adr,
      sef95: features.spectral.sef95,
      contSuppressed: features.continuity.type === 'suppressed' ? 1 : 0,
      contBurst: features.continuity.type === 'burst_suppression' ? 1 : 0,
      contDiscontinuous: features.continuity.type === 'discontinuous' ? 1 : 0,
      asymmetryIdx: features.asymmetry.index,
      seizureBurdenMinPerHour: features.seizure.burdenMinutesPerHour,
      artifactPct: features.artifacts.totalArtifactPct
    };
    
    // Evaluate multiple decision trees
    const treePredictions = this.trees.map(tree => tree.evaluate(mlFeatures));
    const meanPrediction = treePredictions.reduce((a, b) => a + b, 0) / treePredictions.length;
    
    // Calculate confidence and generate prediction
    const encephalopathyScore = Math.max(0, Math.min(10, meanPrediction));
    const confidence = this.calculateConfidence(mlFeatures, treePredictions);
    
    return {
      encephalopathyScore,
      confidence,
      features: mlFeatures,
      severity: this.thresholdConfig.assessSeverity(features, 'ADULT'),
      recommendations: this.generateRecommendations(encephalopathyScore, features)
    };
  }
  
  // Legacy method for backward compatibility
  predictLegacy(session: Session): EnhancedMLPrediction {
    // Convert legacy session data to qEEG features format
    const qEEGFeatures = this.convertLegacySession(session);
    return this.predict(qEEGFeatures);
  }
}
```

#### Sliding Window Processing for Real-Time Analysis
```typescript
// Real-Time Sliding Window Processor
class SlidingWindowProcessor {
  private processor: qEEGFeatureExtractor;
  private mlModel: EnhancedRandomForestModel;
  private state: RealTimeState;
  
  constructor(windowSize: number = 30, overlap: number = 15) {
    this.processor = new qEEGFeatureExtractor();
    this.mlModel = new EnhancedRandomForestModel();
    this.state = this.initializeRealTimeState();
  }
  
  startProcessing(intervalMs: number = 1000): void {
    // Start continuous processing loop
    this.processingInterval = setInterval(async () => {
      const windowData = this.extractCurrentWindow();
      const features = await this.processor.extractFeatures(windowData);
      const prediction = this.mlModel.predict(features);
      
      // Generate alerts for critical conditions
      const alerts = this.generateAlerts(features, prediction);
      
      // Update real-time state and trigger callbacks
      this.updateRealTimeState(features, prediction, alerts);
      this.triggerCallbacks(features, prediction, alerts);
    }, intervalMs);
  }
  
  addEEGData(data: EEGData): void {
    // Add new data to circular buffer
    this.state.buffer.samples.push(...data.samples);
    this.state.buffer.timestamps.push(...data.timestamps);
    this.maintainBufferSize();
  }
  
  private generateAlerts(features: qEEGFeatures, prediction: MLPrediction): string[] {
    const alerts: string[] = [];
    
    if (features.artifacts.totalArtifactPct > 0.3) {
      alerts.push(`High artifact level: ${(features.artifacts.totalArtifactPct * 100).toFixed(1)}%`);
    }
    
    if (prediction.encephalopathyScore > 7) {
      alerts.push(`Severe encephalopathy: ${prediction.encephalopathyScore.toFixed(1)}/10`);
    }
    
    if (features.seizure.burdenMinutesPerHour > 5) {
      alerts.push(`High seizure burden: ${features.seizure.burdenMinutesPerHour.toFixed(1)} min/hour`);
    }
    
    if (features.continuity.type === 'suppressed') {
      alerts.push('EEG suppression detected');
    }
    
    return alerts;
  }
}
```

#### Cohort-Specific Threshold Configuration
```typescript
// Threshold Configuration System
class ThresholdConfiguration {
  private cohortThresholds: Map<CohortType, CohortThresholds>;
  
  assessSeverity(features: qEEGFeatures, cohort: CohortType): SeverityAssessment {
    const thresholds = this.cohortThresholds.get(cohort);
    
    return {
      level: this.determineSeverityLevel(features, thresholds),
      confidence: this.calculateSeverityConfidence(features, thresholds),
      criticalFactors: this.identifyCriticalFactors(features, thresholds),
      recommendations: this.generateSeverityRecommendations(features, thresholds)
    };
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
