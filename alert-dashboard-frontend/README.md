# 🎯 Adaptive Alert Dashboard

A production-ready, enterprise-grade administrator dashboard for the Adaptive Alert Tuning Agent (AATA) system. Built with modern web technologies to provide system engineers with powerful tools for alert management, analysis, and optimization.

## ✨ Key Features

### 🌙 **Dark Mode Support**
- System-wide dark mode with persistent preferences
- Easy toggle from header or settings
- Optimized colors for extended monitoring sessions

### 🚨 **Advanced Alert Management**
- **Real-time monitoring** with auto-refresh (configurable 10s-5min)
- **Comprehensive filtering**: Search, service, type, severity, state
- **Detailed alert modals** with full context and metrics
- **Export capabilities**: CSV and JSON formats
- **Pagination** with 100 alerts per page
- **View details** button for in-depth alert inspection

### 🔔 **Smart Notifications**
- **Toast notifications** for all important events
- **Auto-dismiss** after 5 seconds
- **Notification history** with badge counter
- Success, error, warning, and info types

### 📊 **ML Analytics Dashboard**
- **Model performance** metrics with confidence intervals
- **Feature importance** visualization
- **Cross-validation** results
- **Multiple chart types**: Line, Area, Pie charts
- **Hyperparameter** details for all models

### ⚙️ **Adaptive Threshold Configuration**
- **Intelligent recommendations** with rationale
- **Visual comparisons** of current vs recommended thresholds
- **Confidence scoring** for each suggestion
- **Category-based organization**
- **JSON export** capability

### 🔗 **Alert Correlation & Incidents**
- **Automatic correlation** detection
- **Incident grouping** with root cause analysis
- **Service impact** assessment
- **Correlation strength** indicators

### 🔮 **Predictive Alerting**
- **Future issue forecasting**
- **Trend analysis** with rate of change
- **Risk level** assessment
- **Proactive recommendations**

### ⚡ **Auto-Remediation**
- **Automated suggestions** for common issues
- **Quick action buttons** for immediate fixes
- **Success rate** tracking
- **Category-based remediation**

### 🔍 **System Status Monitoring**
- **Real-time API health** checks
- **Endpoint testing** for all services
- **Response time** measurement
- **Troubleshooting guide** for common issues

### 🛠️ **Settings & Configuration**
- **Appearance**: Dark mode toggle
- **Data Refresh**: Auto-refresh with custom intervals
- **Export Settings**: Format and date range selection
- **API Configuration**: Connection status and details

## 🛠️ Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3 (with dark mode support)
- **Charts**: Recharts 2.10
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **State Management**: React Context API
- **Date Handling**: date-fns

## 📋 Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** package manager
- **AATA backend service** running on port 3008
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🚀 Quick Start

### Installation

```bash
# Navigate to frontend directory
cd alert-dashboard-frontend

# Install dependencies
npm install
```

### Configuration

Create a `.env` file in the root directory:

```env
# Backend API URL (auto-detected if not set)
VITE_API_BASE_URL=http://localhost:3008

# Optional: API key if backend requires authentication
VITE_API_KEY=your-api-key-if-required
```

### Development

```bash
# Start development server on port 3009
npm run dev
```

The dashboard will be available at `http://localhost:3009`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Build output will be in ./dist directory
```

### Docker Deployment

```bash
# Build Docker image
docker build -t alert-dashboard-frontend .

# Run container
docker run -p 3009:3009 alert-dashboard-frontend
```

## 📁 Project Structure

```
alert-dashboard-frontend/
├── src/
│   ├── components/
│   │   ├── Layout.tsx              # Main layout with sidebar & header
│   │   ├── NotificationToast.tsx   # Toast notification system
│   │   ├── AlertDetailModal.tsx    # Alert detail modal
│   │   └── AdvancedFilters.tsx     # Advanced filtering component
│   ├── context/
│   │   └── AppContext.tsx          # Global state management
│   ├── pages/
│   │   ├── Dashboard.tsx           # Overview dashboard
│   │   ├── AlertData.tsx           # Alert data with filters & export
│   │   ├── ThresholdConfig.tsx     # Threshold recommendations
│   │   ├── MLAnalytics.tsx         # ML model analytics
│   │   ├── HistoricalAnalysis.tsx  # Historical data analysis
│   │   ├── AdvancedFeatures.tsx    # Advanced features overview
│   │   ├── Correlations.tsx        # Alert correlations & incidents
│   │   ├── Predictions.tsx         # Predictive alerting
│   │   ├── Remediation.tsx         # Auto-remediation suggestions
│   │   ├── SystemStatus.tsx        # System health monitoring
│   │   └── Settings.tsx            # User settings & configuration
│   ├── services/
│   │   └── api.ts                  # API service layer
│   ├── utils/
│   │   └── exportUtils.ts          # Export utilities (CSV/JSON)
│   ├── App.tsx                     # Main app component
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Global styles
├── public/
├── dist/                            # Production build output
├── index.html
├── vite.config.ts
├── tailwind.config.js               # Tailwind with dark mode
├── tsconfig.json
├── package.json
├── README.md                        # This file
└── FEATURES_GUIDE.md                # Detailed features documentation
```

## 🌐 API Endpoints

The dashboard connects to the following AATA backend API endpoints:

### Core Endpoints
- `GET /api/health` - Health check
- `GET /api/summary` - Alert summary statistics
- `GET /api/alerts` - Paginated alert data (with page & limit params)
- `GET /api/recommendations` - Threshold recommendations
- `GET /api/adaptive-config` - Active adaptive configuration
- `GET /api/analysis` - Historical analysis report
- `GET /api/ml-report` - ML model performance report

### Advanced Features Endpoints
- `GET /api/adaptive-learning` - Adaptive learning metrics
- `GET /api/correlations` - Alert correlations
- `GET /api/incidents` - Grouped incidents
- `GET /api/predictions` - Predictive alerts and trends
- `GET /api/deduplication` - Deduplication results
- `GET /api/contextual-thresholds` - Contextual threshold adjustments
- `GET /api/remediation` - Remediation suggestions
- `GET /api/experiments` - A/B testing experiments
- `GET /api/features` - Features overview
- `GET /api/analysis-summary` - Analysis summary metrics
- `GET /api/routing` - Alert routing decisions
- `GET /api/realtime-stats` - Real-time statistics

**Note**: All endpoints support CORS and return JSON responses.

## 🎯 Key Pages & Features

### 📊 Dashboard
- **Real-time metrics** cards showing total alerts, services, states
- **Interactive charts**: Bar charts, pie charts for distribution
- **System status** indicators
- **Service breakdown** table with percentages
- **Quick links** to advanced features

### 🚨 Alert Data
- **Advanced filtering**: Search, service, type, severity, state
- **Alert details modal** with full context on click
- **Export to CSV/JSON** with filtered data
- **Pagination** supporting thousands of alerts
- **Color-coded badges** for severity and state
- **Responsive table** with horizontal scroll

### ⚙️ Threshold Configuration
- **Visual comparison** charts (current vs recommended)
- **Detailed recommendations** with confidence scores
- **Rationale** for each suggestion
- **Category organization** (Error, Performance, Availability)
- **JSON export** for implementation
- **Impact calculations** for changes

### 🧠 ML Analytics
- **Model performance** cards with progress bars
- **Cross-validation** metrics with confidence intervals
- **Feature importance** visualizations (line & area charts)
- **Hyperparameter details** for all models
- **Data statistics** and split visualization
- **Training timeline** and version tracking

### 📈 Historical Analysis
- **Service baselines** and performance trends
- **False positive** detection and analysis
- **Temporal patterns**: Peak hours, day-of-week analysis
- **Actionable recommendations** based on patterns

### ✨ Advanced Features
- **Feature cards** for all AI/ML capabilities
- **Status indicators** (Active/Available)
- **Configuration overview** with environment details
- **Benefits summary** for each feature

### 🔗 Correlations & Incidents
- **Correlation detection** between alerts
- **Incident grouping** with root cause suggestions
- **Service impact** assessment
- **Timeline visualization** for incidents

### 🔮 Predictions
- **Future issue forecasting** based on trends
- **Risk level** assessment (High/Medium/Low)
- **Confidence scores** for predictions
- **Trend analysis** with rate of change
- **Proactive recommendations**

### ⚡ Remediation
- **Automated suggestions** for common issues
- **Quick action buttons** for fixes
- **Category-based** organization
- **Success rate** tracking
- **Manual and automated** action support

### 🔍 System Status
- **Real-time health checks** for all API endpoints
- **Response time** measurement
- **Visual status** indicators (healthy/error)
- **Troubleshooting guide**
- **Raw data** preview for debugging

### 🛠️ Settings
- **Dark mode** toggle with persistence
- **Auto-refresh** configuration (10s-5min)
- **Export settings** (format, date range)
- **API configuration** display
- **System information** display

## 🎨 UI/UX Features

### Design System
- **Modern color palette**:
  - Primary: Blue (#0ea5e9)
  - Sidebar: Dark slate (#1e293b)
  - Accents: Purple, Green, Orange, Red
  - Background: Light gray (#f8fafc) / Dark (#111827)
- **Consistent iconography** using Lucide React
- **Professional typography** with system fonts
- **Smooth animations** and transitions
- **Accessibility** considerations throughout

### Responsiveness
- **Mobile-first** design approach
- **Responsive grid** layouts
- **Touch-friendly** controls
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Optimized navigation** for all screen sizes

### Loading States
- **Spinner animations** for data fetching
- **Skeleton screens** for content placeholders
- **Progressive loading** for large datasets
- **Error boundaries** for graceful failures

## 🔧 Port Configuration

The dashboard runs on **port 3009** by default (configured in `vite.config.ts`):
- Avoids conflicts with default Vite port (5173)
- Separate from AATA backend (3008)
- Easy to change via configuration

## 🌐 Browser Support

**Supported Browsers**:
- Chrome/Edge (latest & previous version)
- Firefox (latest & previous version)
- Safari (latest & previous version)

**Minimum Requirements**:
- ES6+ JavaScript support
- CSS Grid and Flexbox
- LocalStorage API
- Fetch API

## 🚀 Performance

### Optimization Techniques
- **Code splitting** with dynamic imports
- **Lazy loading** of routes and components
- **Memoization** for expensive calculations
- **Debounced search** to reduce API calls
- **Efficient re-renders** using React best practices
- **Optimized bundle** size with tree-shaking

### Performance Metrics
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Bundle size: < 500KB (gzipped)
- Lighthouse score: > 90

## 🔒 Security

- **API key support** (optional, via env variables)
- **CORS-enabled** API communication
- **No sensitive data** in localStorage
- **Secure defaults** for all configurations
- **XSS protection** with React's built-in escaping
- **HTTPS recommended** for production

## 🐛 Troubleshooting

### Dashboard Not Loading
1. Verify backend is running: `http://localhost:3008/api/health`
2. Check browser console for errors (F12)
3. Ensure correct `VITE_API_BASE_URL` in `.env`
4. Clear browser cache and localStorage
5. Try different browser

### Data Not Displaying
1. Check if alert files exist in backend
2. Verify ML service is running
3. Review backend logs for errors
4. Try manual refresh button
5. Visit System Status page for diagnostics

### Export Not Working
1. Check browser download permissions
2. Ensure data is loaded before exporting
3. Try different export format
4. Check console for JavaScript errors
5. Verify browser supports Blob API

### Dark Mode Issues
1. Clear localStorage and refresh
2. Toggle dark mode multiple times
3. Check if browser has dark mode override
4. Verify Tailwind dark mode is configured

## 📚 Documentation

- **[FEATURES_GUIDE.md](./FEATURES_GUIDE.md)** - Comprehensive feature documentation
- **[QUICK_START_NEW_FEATURES.md](./QUICK_START_NEW_FEATURES.md)** - Quick start guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture (if available)
- **[Backend API Docs](../alert-agent-data-collect-service/README.md)** - AATA backend reference

## 🤝 Contributing

This is an academic research project. For questions or suggestions:
1. Review existing documentation
2. Check troubleshooting guide
3. Contact project maintainers

## 🎓 Research Project

**Project ID**: 25-26J-478 RP  
**Title**: Adaptive Alert Tuning Agent (AATA)  
**Institution**: Sri Lanka Institute of Information Technology  
**Program**: B.Sc. (Hons) in Information Technology  
**Specialization**: Software Engineering  
**Year**: 2025-2026

## 📝 Version History

### v1.0.0 (Current) - February 2026
- ✨ Complete UI redesign with modern aesthetics
- 🌙 Dark mode implementation
- 🔔 Toast notification system
- 📊 Enhanced data visualizations
- 🔍 Advanced filtering and search
- 💾 Export functionality (CSV/JSON)
- ⚙️ Settings page with configuration options
- 📱 Improved mobile responsiveness
- ⚡ Performance optimizations
- 🎯 Alert detail modal
- 🛠️ Context-based state management
- 🎨 Tailwind CSS integration
- 🔄 Auto-refresh capability
- 🚀 Production-ready build

## 📄 License

This project is part of academic research for educational purposes.  
All rights reserved © 2026 SLIIT Research Team

---

**Built with ❤️ for System Engineers**

Need help? Check [FEATURES_GUIDE.md](./FEATURES_GUIDE.md) for detailed documentation.

