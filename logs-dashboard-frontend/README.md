# Logs Dashboard Frontend

A modern React-based dashboard for visualizing and analyzing aggregated logs from the log aggregation service.

## Features

- **Dashboard**: Overview with summary statistics and recent logs
- **Logs Viewer**: Filterable log viewer with pagination and search
- **Trace Correlation**: View distributed traces and root cause analysis
- **Templates**: Manage and view log templates discovered through ML
- **Analytics**: Visual charts and insights into log patterns

## Prerequisites

- Node.js v16 or higher
- npm v7 or higher
- Log Aggregation Service running on port 3005

## Installation

1. Navigate to the logs-dashboard-frontend directory:
```bash
cd logs-dashboard-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (or use the existing one):
```env
VITE_LOG_AGGREGATION_API_URL=http://localhost:3005
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5174`

## Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Preview Production Build

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
logs-dashboard-frontend/
├── src/
│   ├── api/
│   │   └── logAggregationApi.ts    # API client for log aggregation service
│   ├── components/
│   │   ├── layout/                  # Layout components (Sidebar, Header)
│   │   └── logs/                    # Log-related components
│   ├── pages/
│   │   ├── Dashboard.tsx           # Main dashboard
│   │   ├── LogsViewer.tsx          # Log list viewer
│   │   ├── TraceView.tsx           # Trace correlation view
│   │   ├── TemplatesPage.tsx       # Template management
│   │   └── Analytics.tsx            # Analytics and charts
│   ├── types/
│   │   └── logAggregation.types.ts  # TypeScript type definitions
│   ├── App.tsx                      # Main app component with routing
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Global styles
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## API Endpoints Used

The frontend communicates with the log aggregation service on the following endpoints:

- `GET /health` - Health check
- `GET /api/logs` - Query logs with filters
- `GET /api/traces/:traceId` - Get trace logs
- `GET /api/traces/:traceId/root-cause` - Get root cause analysis
- `GET /api/templates` - Get all templates
- `POST /api/templates/mine` - Mine new templates
- `DELETE /api/templates/:id` - Delete template

## Features in Detail

### Dashboard
- Summary cards showing total logs, errors, warnings, and services
- Recent logs feed
- Quick links to filtered views

### Logs Viewer
- Filter by service, level, event, and trace ID
- Pagination support
- Click to view full log details
- Color-coded log levels

### Trace View
- Timeline visualization of distributed traces
- Root cause analysis display
- Grouped logs by service
- Click to view individual log details

### Templates
- View all discovered log templates
- Filter by service
- Mine new templates from aggregated logs
- Delete templates

### Analytics
- Pie chart: Logs by level
- Bar chart: Logs by service
- Line chart: Logs over time
- Summary statistics

## Technologies Used

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Chart.js** - Data visualization
- **Axios** - HTTP client
- **date-fns** - Date formatting
- **Headless UI** - Accessible UI components
- **Heroicons** - Icon library

## Environment Variables

- `VITE_LOG_AGGREGATION_API_URL` - Base URL for the log aggregation API (default: http://localhost:3005)

## Troubleshooting

### CORS Errors
Make sure the log aggregation service has CORS enabled for the frontend origin.

### API Connection Issues
1. Verify the log aggregation service is running on port 3005
2. Check the `VITE_LOG_AGGREGATION_API_URL` environment variable
3. Check browser console for detailed error messages

### Build Errors
1. Make sure all dependencies are installed: `npm install`
2. Check TypeScript errors: `npm run build`
3. Verify Node.js version is 16+

## License

Part of the Research Project for log structuring and enrichment in microservice architectures.

