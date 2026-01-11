# HealthMatrix Service

Firebase Functions project for HealthMatrix Service.

## Setup

1. Install dependencies:
   ```bash
   npm install
   cd functions && npm install
   ```

2. Update Firebase project ID in `.firebaserc`:
   ```json
   {
     "projects": {
       "default": "your-actual-project-id"
     }
   }
   ```

3. Login to Firebase:
   ```bash
   firebase login
   ```

## Development

### Build the functions
```bash
cd functions
npm run build
```

### Run locally with emulators
```bash
npm run serve
```

The health endpoint will be available at:
```
http://localhost:5001/your-project-id/us-central1/health
```

### Watch mode (auto-rebuild on changes)
```bash
cd functions
npm run build:watch
```

## Deployment

Deploy all functions:
```bash
npm run deploy
```

Or deploy from the functions directory:
```bash
cd functions
npm run deploy
```

## Available Functions

### health
- **Type**: HTTP Function
- **Description**: Health check endpoint that returns service status
- **URL**: `https://us-central1-your-project-id.cloudfunctions.net/health`
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "HealthMatrix Service",
    "timestamp": "2026-01-11T...",
    "uptime": 123.456
  }
  ```

## Project Structure

```
.
├── functions/
│   ├── src/
│   │   └── index.ts          # Cloud Functions source code
│   ├── package.json
│   └── tsconfig.json
├── firebase.json               # Firebase configuration
├── .firebaserc                # Firebase project configuration
└── package.json
```
