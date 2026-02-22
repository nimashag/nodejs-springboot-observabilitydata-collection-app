# Adaptive Alert Dashboard

A professional administrator-level dashboard for monitoring and analyzing the Adaptive Alert Tuning Agent (AATA) system. Built with React, TypeScript, and Tailwind CSS.

## Features

### 📊 Dashboard Overview
- Real-time alert statistics and metrics
- Service-level breakdown with visual charts
- Alert distribution by type, severity, and state
- System status monitoring

### 🚨 Alert Data
- Comprehensive alert history with pagination
- Advanced filtering (service, type, severity)
- Search functionality
- CSV export capability
- Detailed alert information

### ⚙️ Threshold Configuration
- Adaptive threshold recommendations
- Service-specific configuration
- Confidence scoring
- Visual comparison of current vs recommended thresholds
- Configuration export (JSON)

### 🧠 ML Model Analytics
- Machine learning model performance metrics
- Cross-validation and test accuracy
- Feature importance visualization
- Hyperparameter details
- Model training statistics

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router v6

## Prerequisites

- Node.js 18+ 
- npm or yarn
- AATA backend service running on port 3008

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3008
VITE_API_KEY=your-api-key-if-required
```

## Development

```bash
# Start development server on port 3009
npm run dev
```

The dashboard will be available at `http://localhost:3009`

## Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
alert-dashboard-frontend/
├── src/
│   ├── components/
│   │   └── Layout.tsx          # Main layout with sidebar navigation
│   ├── pages/
│   │   ├── Dashboard.tsx       # Overview dashboard
│   │   ├── AlertData.tsx       # Alert data table and filters
│   │   ├── ThresholdConfig.tsx # Threshold recommendations
│   │   └── MLAnalytics.tsx     # ML model analytics
│   ├── services/
│   │   └── api.ts              # API service layer
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## API Endpoints

The dashboard connects to the following AATA API endpoints:

- `GET /api/health` - Health check
- `GET /api/summary` - Alert summary statistics
- `GET /api/alerts` - Paginated alert data
- `GET /api/recommendations` - Threshold recommendations
- `GET /api/adaptive-config` - Active configuration
- `GET /api/ml-report` - ML model report

## Features in Detail

### Navigation
- Professional left sidebar navigation
- Active route highlighting
- Administrator-level branding
- Responsive design

### Dashboard
- Key metrics cards (Total Alerts, Services, Fired, Resolved)
- Bar chart for alerts by service
- Pie charts for alert types and severity
- System status indicators
- Service breakdown table

### Alert Data
- Paginated table with 100 alerts per page
- Real-time search across all fields
- Multi-filter support (service, type, severity)
- Export to CSV functionality
- Color-coded severity and state badges

### Threshold Configuration
- Comparison chart (current vs recommended)
- Detailed recommendations table
- Confidence indicators
- Rationale explanations
- Active configuration display
- JSON export

### ML Analytics
- Model performance cards
- Cross-validation metrics
- Feature importance chart
- Hyperparameter details
- Training statistics
- Model file status

## Port Configuration

The dashboard runs on **port 3009** by default (configured in `vite.config.ts`). This avoids conflicts with:
- Port 5173 (default Vite port)
- Port 5174 (other frontend services)
- Port 3008 (AATA backend)

## Styling

The dashboard uses a professional color scheme:
- Primary: Blue (#0ea5e9)
- Sidebar: Dark slate (#1e293b)
- Accents: Purple, Green, Orange
- Background: Light gray (#f8fafc)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Notes

- All API calls include error handling
- Loading states for better UX
- Responsive design for all screen sizes
- Type-safe with TypeScript
- Component-based architecture

## Research Project

**Project**: 25-26J-478 RP  
**Component**: Adaptive Alert Tuning Agent (AATA)  
**Institution**: Sri Lanka Institute of Information Technology

## License

This project is part of academic research for B.Sc. (Hons) Degree in Information Technology Specialising in Software Engineering.

