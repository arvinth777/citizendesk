# Citizen Desk - Hyperlocal Civic Reports

Citizen Desk is a smart, AI-powered civic reporting application that allows citizens to instantly report issues like potholes, broken streetlights, or illegal dumping to their local municipalities. It bridges the gap between citizens and administration by providing an intuitive, transparent, and scalable platform for civic engagement.

## 🚀 Live Demo

You can view the fully working production deployment here:
[**Live Application on Google Cloud Run**](https://citizen-desk-488048870871.us-central1.run.app)

*(If you are testing this locally on your own machine, you must follow the Setup Instructions below to provide API keys.)*

---

## 📸 Platform Gallery

*(**Note to Developer:** Please save your screenshots to the `assets/screenshots/` folder in this repository and ensure the filenames match the ones below so they render correctly on GitHub!)*

### Home Page
A welcoming landing page designed to encourage community engagement and seamlessly onboard users to the reporting workflow.
![Home Page](assets/screenshots/home.png)

### Live Incident Map
A public-facing map showing active and resolved issues. Citizens can explore hotspots, view detailed reports, and "corroborate" existing issues rather than filing duplicates.
![Live Map](assets/screenshots/map.png)

### My Reports
Citizens can track the exact status of their civic contributions, from the moment it is "Open" to when the municipality marks it as "Resolved".
![My Reports](assets/screenshots/my-reports.png)

### Analytics Dashboard (Admin)
A centralized command center for government staff to monitor incoming reports, view severity metrics, and analyze trends to optimize resource allocation.
![Analytics Overview](assets/screenshots/stats.png)

### Platform Configuration (Admin)
Administrative control center allowing city officials to set official geographic boundaries for their civic instance.
![Platform Configuration](assets/screenshots/admin.png)

---

## 🌟 Key Features
- **AI-Powered Severity Scoring**: Uses Google Gemini 2.0 Flash multimodal analysis to automatically evaluate uploaded photos, generate escalation drafts, and assign objective priority scores based on visual severity.
- **Stateless Backend Architecture**: Designed for extreme scale and cost-efficiency. Utilizing Google Cloud Run to spin up instances instantly during sudden spikes in traffic (e.g., following a severe storm).
- **Secure by Default**: Media attachments are strictly processed on the server to strip EXIF data (preventing location leaks) before public bucket upload. Server uploads are secured via the Firebase Admin SDK using Application Default Credentials (ADC).
- **Real-Time Data Synchronization**: Firebase Firestore ensures that when a citizen submits a report, the public map updates instantly for all active users without requiring a page refresh.

---

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

---

## 🏗️ Technical Architecture
- **Frontend**: React 19, Vite, TailwindCSS v4, Framer Motion
- **Maps**: `@vis.gl/react-google-maps` (Google Maps JavaScript API v3)
- **Backend/API**: Express (Node.js) containerized with Docker, deployed to Google Cloud Run
- **AI Integration**: Google Gemini 2.0 Flash (`@google/genai`) 
- **Database/Storage**: Firebase Firestore (NoSQL) & Firebase Cloud Storage
