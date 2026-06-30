# Citizen Desk - Hyperlocal Civic Reports

Citizen Desk is a smart, AI-powered civic reporting application that allows citizens to instantly report issues like potholes, broken streetlights, or illegal dumping to their local municipalities.

## 🚀 Live Demo

You can view the fully working production deployment here:
[**Live Application on Google Cloud Run**](https://citizen-desk-488048870871.us-central1.run.app)

*(If you are testing this locally on your own machine, you must follow the Setup Instructions below to provide API keys.)*

## 🛠️ Setup Instructions (For Judges)

If you are a hackathon judge and wish to run this repository locally, please follow these steps. For security reasons, GitHub Push Protection blocks the API keys from being committed to the codebase directly.

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment Variables**
   Create a new file in the root directory named `.env`, and add your API keys:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   ```
   *Note: `VITE_GOOGLE_MAPS_API_KEY` is required for the interactive map to render. If it is missing, you will see a "Google Maps Key Missing" error on the map view.*

3. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5174` in your browser.

4. **Firebase Setup**
   The application communicates with a secure Firebase Firestore and Storage backend. The Firebase configuration is located in `src/lib/firebase.ts`. 

## 🏗️ Technical Architecture
- **Frontend**: React, Vite, TailwindCSS, Framer Motion
- **Maps**: `@vis.gl/react-google-maps` (Google Maps JavaScript API v3)
- **Backend/API**: Express (Node.js) containerized with Docker, deployed to Google Cloud Run
- **AI Integration**: Google Gemini 2.0 Flash (`@google/genai`) for intelligent image analysis and severity scoring
- **Database/Storage**: Firebase Firestore (NoSQL) & Firebase Cloud Storage
- **Security**: Images are processed using `sharp` to strip all EXIF metadata before public bucket upload, and server uploads are secured via the Firebase Admin SDK using Application Default Credentials (ADC).
