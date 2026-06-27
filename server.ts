import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  initializeFirestore
} from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Client
const app = initializeApp(firebaseConfig);
// Use the specific database ID if provided in metadata, otherwise defaults to (default)
const db = getFirestore(app, "ai-studio-remixbroadeningp-32ad8737-a29d-40a1-935e-f6bf6fe10880");

const ADMIN_SECRET = "DUTY_TRACKER_SECRET_2024";

async function startServer() {
  const expressApp = express();
  expressApp.use(express.json({ limit: '10mb' }));

  const PORT = 3000;

  // Middleware to check admin password
  const checkAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const password = req.headers["x-admin-password"];
    const validPasswords = ["dutytracker", "army123", process.env.ADMIN_PASSWORD].filter(Boolean);
    
    if (validPasswords.includes(password as string)) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // API Routes
  expressApp.post("/api/verify-password", async (req, res) => {
    const { password } = req.body;
    const validPasswords = ["dutytracker", "army123", process.env.ADMIN_PASSWORD].filter(Boolean);
    if (validPasswords.includes(password)) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  expressApp.post("/api/duties", checkAdminAuth, async (req, res) => {
    try {
      const duty = req.body;
      console.log("Syncing duty:", duty.id);
      await setDoc(doc(db, "duties", duty.id), {
        ...duty,
        admin_secret: ADMIN_SECRET,
        updatedAt: new Date().toISOString(),
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Firestore Error in /api/duties:", error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  expressApp.delete("/api/duties/:id", checkAdminAuth, async (req, res) => {
    try {
      console.log("Deleting duty:", req.params.id);
      await deleteDoc(doc(db, "duties", req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Firestore Error in DELETE /api/duties:", error);
      res.status(500).json({ error: error.message });
    }
  });

  expressApp.post("/api/duties/batch", checkAdminAuth, async (req, res) => {
    try {
      const { duties } = req.body;
      console.log("Syncing batch of duties:", duties.length);
      const batch = writeBatch(db);
      const updatedAt = new Date().toISOString();
      
      duties.forEach((duty: any) => {
        if (!duty.id) return;
        const docRef = doc(db, "duties", duty.id);
        batch.set(docRef, { ...duty, admin_secret: ADMIN_SECRET, updatedAt }, { merge: true });
      });
      
      await batch.commit();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Firestore Error in /api/duties/batch:", error);
      res.status(500).json({ error: error.message });
    }
  });

  expressApp.post("/api/duties/sync-rank", checkAdminAuth, async (req, res) => {
      try {
        const { lastName, newRank } = req.body;
        const q = query(collection(db, "duties"), where("lastName", "==", lastName));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        const updatedAt = new Date().toISOString();
        
        snapshot.forEach((d) => {
          batch.update(d.ref, { rank: newRank, admin_secret: ADMIN_SECRET, updatedAt });
        });
        
        await batch.commit();
        res.json({ success: true });
      } catch (error: any) {
        console.error("Firestore Error:", error);
        res.status(500).json({ error: error.message });
      }
  });

  expressApp.post("/api/duties/rename-category", checkAdminAuth, async (req, res) => {
      try {
        const { oldName, newName } = req.body;
        const q = query(collection(db, "duties"), where("category", "==", oldName));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        const updatedAt = new Date().toISOString();
        
        snapshot.forEach((d) => {
          batch.update(d.ref, { category: newName, admin_secret: ADMIN_SECRET, updatedAt });
        });
        
        await batch.commit();
        res.json({ success: true });
      } catch (error: any) {
        console.error("Firestore Error:", error);
        res.status(500).json({ error: error.message });
      }
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    expressApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    expressApp.use(express.static(distPath));
    expressApp.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  expressApp.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
