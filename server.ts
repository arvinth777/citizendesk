import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, Timestamp, doc, setDoc, deleteDoc } from "firebase/firestore";
import fs from "fs";
import multer from "multer";
import { initializeApp as initializeAdminApp, applicationDefault } from "firebase-admin/app";
import { getStorage as getAdminStorage } from "firebase-admin/storage";
import sharp from "sharp";
import compression from "compression";
import { processReportLogic } from "./src/lib/reportProcessor.js";

dotenv.config();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize Firebase for the server
const firebaseConfig = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "firebase-applet-config.json"), "utf8"));
const appFirebase = initializeApp(firebaseConfig, "server-app");
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId)
  : getFirestore(appFirebase);

// Initialize Firebase Admin for Storage uploads
initializeAdminApp({
  credential: applicationDefault(),
  storageBucket: firebaseConfig.storageBucket
});
const bucket = getAdminStorage().bucket();



async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5174;

  app.use(express.json({ limit: "50mb" }));

  app.use('/uploads', express.static('uploads'));

  app.post("/api/analyze-media", upload.single('media'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No media file provided" });
      }

      console.log(`[Analyze Media] Received file: ${req.file.originalname} (${req.file.mimetype})`);
      
      const uploadResult = await ai.files.upload({
        file: req.file.path,
        config: { mimeType: req.file.mimetype }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', // Pro model is better for video analysis
        contents: [
          {
            role: 'user',
            parts: [
              { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
              { text: "Analyze this civic issue media. Provide a very short, concise 1-sentence description of the problem shown, suitable for a report description." }
            ]
          }
        ]
      });

      res.json({ description: response.text });
    } catch (error) {
      console.error("Error analyzing media:", error);
      res.status(500).json({ error: "Failed to analyze media" });
    }
  });

  // ── Municipality Contact Lookup ────────────────────────────────────────────
  app.post("/api/find-municipality", async (req, res) => {
    try {
      const { lat, lng, address, category, description } = req.body;
      if (!lat || !lng) return res.status(400).json({ error: "lat and lng required" });

      const prompt = `
You are a civic information assistant with knowledge of India's municipal governance structure.

A civic issue has been reported at:
- Coordinates: ${lat}, ${lng}
- Address / Landmark: ${address || "Not provided"}
- Issue Category: ${category || "General"}
- Issue Description: ${description || "Not provided"}

Your task:
1. Identify the local administrative body responsible for this area. This could be a Municipal Corporation, Municipality, Town Panchayat, District Collector's office, or a specific department (e.g., PWD, BWSSB, BBMP).
2. Provide realistic contact information — official email IDs and phone numbers used by Indian municipal bodies in this region. Use real government domain patterns (e.g., bbmp.gov.in, chennaicorporation.gov.in, tnrd.gov.in).
3. Provide the pre-written email body that the citizen should send.

Return ONLY valid JSON in this exact format, no markdown:
{
  "municipality": {
    "name": "Full official name of the municipal body",
    "type": "Municipal Corporation / Municipality / Town Panchayat / District Collectorate",
    "district": "District name",
    "state": "State name"
  },
  "contacts": [
    {
      "department": "Department name (e.g., Roads & Infrastructure, Sanitation, BWSSB)",
      "designation": "Official designation (e.g., Executive Engineer, Commissioner)",
      "email": "official@domain.gov.in",
      "phone": "+91-XXXXXXXXXX",
      "priority": "primary"
    },
    {
      "department": "Grievance Cell",
      "designation": "Grievance Officer",
      "email": "grievance@domain.gov.in",
      "phone": "+91-1800-XXXXXXX",
      "priority": "secondary"
    }
  ],
  "emailTemplate": {
    "subject": "Civic Issue Report: [Category] at [Location] — Urgent Attention Required",
    "body": "Dear Sir/Madam,\\n\\nI am writing to bring to your urgent attention a civic issue that requires immediate action.\\n\\nIssue Details:\\n- Category: ${category || 'General civic issue'}\\n- Location: ${address || `${lat}, ${lng}`}\\n- Description: ${description || 'Please refer to the attached report.'}\\n- Reported On: ${new Date().toLocaleDateString('en-IN')}\\n\\nThis issue is causing inconvenience to residents and poses a potential safety hazard. I request your department to inspect the location and take necessary corrective action at the earliest.\\n\\nFor your reference, this report has also been logged on the Citizen Desk citizen reporting platform.\\n\\nThank you for your attention.\\n\\nYours sincerely,\\n[Your Name]\\n[Your Contact Number]\\n[Your Address]"
  }
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.2 }
      });

      let text = response.text?.trim() || "";
      // Strip markdown code fences if present
      text = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      
      const data = JSON.parse(text);
      res.json(data);
    } catch (error) {
      console.error("find-municipality error:", error);
      res.status(500).json({ error: "Failed to find municipality info" });
    }
  });

  app.post("/api/process-report", upload.single('media'), async (req, res) => {
    try {
      const { description, lat, lng, reporterId, reporterName, address, municipalityInfo } = req.body;
      if (!lat || !lng) {
        return res.status(400).json({ error: "lat and lng are required" });
      }

      let photoUrl = req.body.photoUrl || "";
      let localFilePath = null;
      let mimeType = null;
      
      if (req.file) {
         localFilePath = req.file.path;
         mimeType = req.file.mimetype;

         // Fix Ephemeral Storage & EXIF Privacy
         console.log(`[Process Report] Stripping EXIF and uploading to Firebase Storage...`);
         const strippedBuffer = await sharp(req.file.path).toBuffer();
         fs.writeFileSync(req.file.path, strippedBuffer);

         const destPath = `reports/${req.file.filename}`;
         await bucket.upload(req.file.path, {
           destination: destPath,
           metadata: { contentType: mimeType }
         });
         
         const fileRef = bucket.file(destPath);
         await fileRef.makePublic();
         photoUrl = fileRef.publicUrl();
         console.log(`[Process Report] Uploaded successfully to ${photoUrl}`);
      }

      const result = await processReportLogic(db as any, ai as any, { 
        description, 
        photoUrl, 
        lat: parseFloat(lat), 
        lng: parseFloat(lng), 
        reporterId, 
        reporterName, 
        address,
        localFilePath,
        mimeType,
        municipalityInfo: municipalityInfo ? JSON.parse(municipalityInfo) : null
      });
      res.json(result);
    } catch (error) {
      console.error("process-report error:", error);
      res.status(500).json({ error: String(error) });
    } finally {
      // Ensure the ephemeral local file is always cleaned up, even on failure
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Failed to delete temp file:", e);
        }
      }
    }
  });

  app.get("/api/predictive-insights", async (req, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const q = query(
        collection(db, "reports"),
        where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo))
      );
      const snapshot = await getDocs(q);
      const reports = snapshot.docs.map(d => {
         const data = d.data();
         return {
           category: data.category,
           severity: data.severity,
           status: data.status,
           lat: data.lat,
           lng: data.lng,
           address: data.address
         };
      });

      const prompt = `
        You are a civic data analyst AI. 
        I am giving you the last 30 days of civic issue reports as a JSON string.
        Analyze the data for geographical clusters (using lat/lng/address), severity trends, and category frequencies.
        Provide a 2-3 sentence "Forecast" (e.g. "Given the recent cluster of water leaks in Area X, expect road damage reports to spike there soon.").
        Also provide 3 short "Actionable Recommendations" for the municipal government based on the data.
        
        Return exactly in this JSON format:
        {
           "forecast": "string",
           "recommendations": ["string", "string", "string"]
        }
        
        Data: ${JSON.stringify(reports)}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
           responseMimeType: "application/json"
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("predictive-insights error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/run-dispatch-agent", async (req, res) => {
    try {
      const q = query(
        collection(db, "reports"),
        where("status", "in", ["open", "verified"])
      );
      const snapshot = await getDocs(q);
      const openReports = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      if (openReports.length === 0) {
        return res.json({ message: "No open reports to dispatch." });
      }

      const prompt = `
        You are an autonomous City Dispatch Agent.
        Your task is to review the following open civic issues and create an optimized "Dispatch Plan" for the city's repair crews.
        Group the issues by geographic proximity (lat/lng) and severity.
        Assign them to 2-3 logical "Crews" (e.g. Crew Alpha, Crew Beta).
        
        Return exactly in this JSON format:
        {
           "planTitle": "string (e.g. Morning Dispatch - North Zone)",
           "crews": [
              {
                 "crewName": "string",
                 "assignedIssueIds": ["string", "string"],
                 "routeSummary": "string (1 sentence describing the geographic route)"
              }
           ]
        }
        
        Open Reports: ${JSON.stringify(openReports.map((r: any) => ({ id: r.id, category: r.category, lat: r.lat, lng: r.lng, severity: r.severity })))}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
           responseMimeType: "application/json"
        }
      });

      const dispatchPlan = JSON.parse(response.text);
      const planRef = doc(collection(db, "dispatch_plans"));
      
      await setDoc(planRef, {
         ...dispatchPlan,
         createdAt: Timestamp.now(),
         status: "active"
      });

      res.json({ message: "Dispatch plan generated", planId: planRef.id, plan: dispatchPlan });
    } catch (error) {
      console.error("run-dispatch-agent error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/seed-mock-data", async (req, res) => {
    try {
      // 1. Clear existing data
      const reportsQuery = query(collection(db, "reports"));
      const reportsSnapshot = await getDocs(reportsQuery);
      for (const d of reportsSnapshot.docs) {
        await deleteDoc(doc(db, "reports", d.id));
      }
      
      const dispatchQuery = query(collection(db, "dispatch_plans"));
      const dispatchSnapshot = await getDocs(dispatchQuery);
      for (const d of dispatchSnapshot.docs) {
        await deleteDoc(doc(db, "dispatch_plans", d.id));
      }

      // 2. Insert mock data
      const locations = [
         { lat: 12.9716, lng: 77.5946, address: "Cubbon Park, Bangalore" },
         { lat: 12.9352, lng: 77.6245, address: "Koramangala 4th Block" },
         { lat: 12.9784, lng: 77.6408, address: "Indiranagar 100ft Road" },
         { lat: 12.9250, lng: 77.5938, address: "Jayanagar 4th Block" },
         { lat: 12.9901, lng: 77.5525, address: "Malleshwaram 8th Cross" },
         { lat: 13.0285, lng: 77.5462, address: "Yeshwanthpur" },
         { lat: 12.9698, lng: 77.7499, address: "Whitefield" }
      ];

      const categories = ["pothole", "garbage", "streetlight", "water_leak", "road_damage", "other"];
      const statuses = ["open", "verified", "in_progress", "resolved"];
      
      const mockReports = [];
      const now = new Date();

      for (let i = 0; i < 40; i++) {
         const loc = locations[Math.floor(Math.random() * locations.length)];
         // Slightly randomize lat/lng around the center
         const rLat = loc.lat + (Math.random() - 0.5) * 0.01;
         const rLng = loc.lng + (Math.random() - 0.5) * 0.01;
         
         const category = categories[Math.floor(Math.random() * categories.length)];
         let status = statuses[Math.floor(Math.random() * statuses.length)];
         if (category === "water_leak") status = "open"; // force some open urgent ones
         
         const pastDate = new Date(now.getTime() - Math.floor(Math.random() * 25) * 24 * 60 * 60 * 1000);

         const id = doc(collection(db, "reports")).id;
         mockReports.push({
            id,
            description: `Mock ${category} report at ${loc.address}. Looks severe.`,
            category,
            severity: Math.floor(Math.random() * 5) + 1,
            status,
            lat: rLat,
            lng: rLng,
            address: loc.address,
            photoUrl: "",
            reporterName: "Mock Citizen",
            reporterId: "mock_user",
            priorityScore: Math.floor(Math.random() * 100),
            escalationSummary: "Mock escalation generated automatically.",
            corroborationCount: Math.floor(Math.random() * 10),
            createdAt: Timestamp.fromDate(pastDate)
         });
      }

      for (const rep of mockReports) {
         await setDoc(doc(db, "reports", rep.id), rep);
      }

      res.json({ message: "Successfully seeded 40 mock reports." });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: String(error) });
    }
  });

  app.use(compression());

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { maxAge: '1y', index: false }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
