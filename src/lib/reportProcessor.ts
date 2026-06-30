import { GoogleGenAI, Type } from "@google/genai";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, Timestamp, Firestore } from "firebase/firestore";

// Haversine formula to calculate distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

export async function processReportLogic(
  db: Firestore,
  ai: GoogleGenAI,
  payload: { description: string, photoUrl: string, lat: number, lng: number, reporterId: string, reporterName: string, address: string, localFilePath?: string, mimeType?: string, municipalityInfo?: any }
) {
  const { description, photoUrl, lat, lng, reporterId, reporterName, address, localFilePath, mimeType, municipalityInfo } = payload;

  const toolsSchemaArray = [
    {
      name: "classify_issue",
      description: "Analyzes the provided civic issue details to categorize it, determine its initial severity, and generate a concise summary.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: ["sanitation", "public_nuisance", "infrastructure", "other"] },
          severity: { type: Type.INTEGER, description: "severity 1 to 5" },
          summary: { type: Type.STRING }
        },
        required: ["category", "severity", "summary"]
      }
    },
    {
      name: "check_duplicates",
      description: "Queries the database to check for existing open or verified civic reports within a 150-meter radius of the given coordinates.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          category: { type: Type.STRING, enum: ["sanitation", "public_nuisance", "infrastructure", "other"] }
        },
        required: ["lat", "lng", "category"]
      }
    },
    {
      name: "assign_priority",
      description: "Calculates a dynamic priority score for a new standalone report based on its severity rating, active community corroboration, and elapsed time.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          severity: { type: Type.INTEGER },
          corroborationCount: { type: Type.INTEGER },
          ageHours: { type: Type.INTEGER }
        },
        required: ["severity", "corroborationCount", "ageHours"]
      }
    },
    {
      name: "draft_escalation",
      description: "Generates a formal 2-3 sentence communication summary designed to be routed directly to municipal authorities.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: ["sanitation", "public_nuisance", "infrastructure", "other"] },
          severity: { type: Type.INTEGER },
          address: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["category", "severity", "address", "description"]
      }
    }
  ];

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      tools: [{ functionDeclarations: toolsSchemaArray }],
      systemInstruction: `You are a civic issue processing agent enforcing the Swachh Bharat Abhiyan (Clean India Mission). Follow these steps strictly in order:
      1. ALWAYS call classify_issue first based on the provided description. Use 'sanitation' for garbage, waste, or dead animals. Use 'public_nuisance' for open urination, illegal dumping, or noise. Use 'infrastructure' for potholes or broken lights.
      2. ALWAYS call check_duplicates next using the coordinates and the category from step 1.
      3. After check_duplicates returns a result, EITHER:
         - If duplicateFound is true, you are done. Do NOT call any more tools.
         - If duplicateFound is false, call BOTH assign_priority AND draft_escalation before finishing. Note: if category is 'sanitation' or 'public_nuisance', assign a slightly higher severity/priority.
      You must chain these tools in this exact order. Do not skip any steps.
      `
    }
  });

  // Build initial message content
  const userParts: any[] = [
    { text: `Process this civic issue report.\n\nLocation: lat=${lat}, lng=${lng}, address="${address || 'unknown'}"\nDescription: "${description || 'No description provided'}"` }
  ];

  if (localFilePath && mimeType) {
    console.log(`[Agent] Uploading file to Gemini: ${localFilePath}`);
    const uploadResult = await ai.files.upload({
      file: localFilePath,
      config: { mimeType }
    });
    userParts.push({ fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } });
  } else if (photoUrl && photoUrl.startsWith('data:image/')) {
    const inlineMimeType = photoUrl.substring(5, photoUrl.indexOf(';'));
    const data = photoUrl.substring(photoUrl.indexOf(',') + 1);
    userParts.push({ inlineData: { data, mimeType: inlineMimeType } });
  }

  console.log('[Agent] Starting report processing pipeline...');
  let response = await chat.sendMessage({ message: userParts } as any);

  let finalData: any = {};
  let isDuplicate = false;
  let duplicateId: string | null = null;

  // Agentic loop — max 6 turns to handle all tool calls
  for (let turn = 0; turn < 6; turn++) {
    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      console.log(`[Agent] Turn ${turn + 1}: No function calls — agent finished.`);
      break;
    }

    console.log(`[Agent] Turn ${turn + 1}: Executing ${functionCalls.length} tool(s): ${functionCalls.map(c => c.name).join(', ')}`);

    // Execute all function calls in this turn and collect responses
    const functionResponseParts: any[] = [];

    for (const call of functionCalls) {
      let callResult: any = { status: "success" };

      if (call.name === "classify_issue") {
        finalData.classify_issue = call.args;
        callResult = {
          classified: true,
          category: call.args.category,
          severity: call.args.severity,
          summary: call.args.summary
        };
        console.log(`  ✓ classify_issue → category=${call.args.category}, severity=${call.args.severity}`);

      } else if (call.name === "check_duplicates") {
        // Query Firestore for nearby reports in same category
        const q = query(
          collection(db, "reports"),
          where("category", "==", call.args.category),
          where("status", "in", ["open", "verified"])
        );
        const docsSnap = await getDocs(q);
        let foundDup: string | null = null;

        docsSnap.forEach(d => {
          const data = d.data();
          if (
            typeof data.lat === 'number' &&
            typeof data.lng === 'number' &&
            !isNaN(data.lat) &&
            !isNaN(data.lng)
          ) {
            const dist = getDistance(lat, lng, data.lat, data.lng);
            if (dist <= 150 && !foundDup) {
              foundDup = d.id;
            }
          }
        });

        if (foundDup) {
          callResult = { duplicateFound: true, duplicateId: foundDup };
          isDuplicate = true;
          duplicateId = foundDup;
          console.log(`  ✓ check_duplicates → DUPLICATE FOUND: ${foundDup}`);
        } else {
          callResult = { duplicateFound: false, duplicateId: null };
          console.log(`  ✓ check_duplicates → No duplicate found`);
        }

      } else if (call.name === "assign_priority") {
        finalData.assign_priority = call.args;
        const score = (Number(call.args.severity) * 10) + Number(call.args.corroborationCount) + Number(call.args.ageHours);
        callResult = { priorityScore: score };
        finalData.priorityScore = score;
        console.log(`  ✓ assign_priority → score=${score}`);

      } else if (call.name === "draft_escalation") {
        finalData.draft_escalation = call.args;
        callResult = { drafted: true, summary: `Escalation drafted for ${call.args.category} at ${call.args.address}` };
        console.log(`  ✓ draft_escalation → drafted for ${call.args.category}`);
      }

      // CORRECT @google/genai v2 format: functionResponse parts
      functionResponseParts.push({
        functionResponse: {
          id: call.id,
          name: call.name,
          response: callResult
        }
      });
    }

    // Send all function responses back to the model in one turn
    response = await chat.sendMessage({ message: functionResponseParts } as any);
  }

  console.log('[Agent] Pipeline complete. Writing to Firestore...');

  // Final writes to Firestore
  if (isDuplicate && duplicateId) {
    // Increment corroboration count on existing report
    const docRef = doc(db, "reports", duplicateId);
    const existingSnap = await getDocs(query(collection(db, "reports"), where("__name__", "==", duplicateId)));
    if (!existingSnap.empty) {
      const docData = existingSnap.docs[0].data();
      await updateDoc(docRef, {
        corroborationCount: (docData.corroborationCount || 0) + 1,
        status: "verified"
      });
    }
    console.log(`[Agent] Incremented corroboration on duplicate report ${duplicateId}`);
    return { message: "This issue was already reported — your report helped confirm it.", isDuplicate: true };
  } else {
    // Create new Firestore document
    const newRef = doc(collection(db, "reports"));
    await setDoc(newRef, {
      category: finalData.classify_issue?.category || "other",
      severity: finalData.classify_issue?.severity || 1,
      summary: finalData.classify_issue?.summary || "",
      status: "open",
      lat,
      lng,
      address: address || "",
      photoUrl: photoUrl || "",
      description: description || "",
      reporterId,
      reporterName,
      priorityScore: finalData.priorityScore || 10,
      escalationSummary: finalData.draft_escalation?.description || finalData.classify_issue?.summary || "A new civic issue has been reported.",
      corroborationCount: 0,
      createdAt: Timestamp.now(),
      resolvedAt: null,
      resolvedPhotoUrl: null,
      municipalityInfo: municipalityInfo || null
    });
    console.log(`[Agent] Created new report document: ${newRef.id}`);
    return { message: "Report submitted successfully.", isDuplicate: false, id: newRef.id };
  }
}
