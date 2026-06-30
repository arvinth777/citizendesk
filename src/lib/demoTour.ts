import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const waitForElement = (selector: string, timeout = 5000): Promise<Element> => {
   return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
         const el = document.querySelector(selector);
         if (el) {
            observer.disconnect();
            resolve(el);
         }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
         observer.disconnect();
         reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
   });
};

export const runDemo = async (navigate: (path: string) => void, onComplete: () => void) => {
  // 1. Fire-and-forget: seed data in background, don't block the tour
  fetch("/api/seed-mock-data", { method: "POST" })
    .then(() => console.log("[Demo] Mock data seeded"))
    .catch((e) => console.warn("[Demo] Seed failed (non-fatal):", e));

  // 2. Navigate home immediately and wait for mount
  navigate("/");
  await waitForElement("#tour-home-title").catch(() => {});

  // 3. Build the driver.js tour
  const driverObj = driver({
    showProgress: true,
    allowClose: true,
    overlayColor: "rgba(0,0,0,0.55)",
    popoverClass: "civic-tour-popover",
    steps: [
      {
        element: "#tour-home-title",
        popover: {
          title: "🏙️ Welcome to Citizen Desk",
          description: "Citizen Desk empowers citizens to report hyper-local issues — potholes, broken streetlights, water leaks — and get them fixed faster than ever.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-nav-report",
        popover: {
          title: "📸 Multimodal AI Reporting",
          description: "Click here to report an issue. Gemini 1.5 Pro watches your photo or video and automatically drafts a formal municipal escalation.",
          onNextClick: () => {
            navigate("/report");
            waitForElement("#tour-report-form")
              .then(() => setTimeout(() => driverObj.moveNext(), 150))
              .catch(() => driverObj.moveNext());
          },
        },
      },
      {
        element: "#tour-report-form",
        popover: {
          title: "🤖 AI Does the Paperwork",
          description: "Upload a photo or video here. Gemini auto-categorizes the issue, assigns a priority score, and writes the escalation — you just hit Submit.",
          side: "top",
        },
      },
      {
        element: "#tour-nav-map",
        popover: {
          title: "🗺️ Live City Map",
          description: "Switch to the city-wide map to see all reported issues as pins or a live heatmap powered by deck.gl WebGL rendering.",
          onNextClick: () => {
            navigate("/map");
            waitForElement("#tour-map-heatmap")
              .then(() => setTimeout(() => driverObj.moveNext(), 150))
              .catch(() => driverObj.moveNext());
          },
        },
      },
      {
        element: "#tour-map-heatmap",
        popover: {
          title: "🌡️ WebGL Heatmap",
          description: "Toggle this to instantly visualize issue density across the entire city using deck.gl — the same engine used by Uber's city-planning tools.",
          side: "bottom",
        },
      },
      {
        element: "#tour-nav-dashboard",
        popover: {
          title: "📊 Analytics Dashboard",
          description: "Head to the dashboard to see the AI-powered forecasting and autonomous dispatch features.",
          onNextClick: () => {
            navigate("/dashboard");
            waitForElement("#tour-dashboard-insights")
              .then(() => setTimeout(() => driverObj.moveNext(), 150))
              .catch(() => driverObj.moveNext());
          },
        },
      },
      {
        element: "#tour-dashboard-insights",
        popover: {
          title: "🔮 Predictive Insights",
          description: "Gemini analyzes 30 days of reporting trends and predicts upcoming infrastructure failures — before they happen. Real AI, real data.",
          side: "bottom",
        },
      },
      {
        element: "#tour-dashboard-dispatch",
        popover: {
          title: "🤖 Autonomous Dispatch Agent",
          description: "This agent clusters open issues geographically and auto-generates optimized crew itineraries — no human dispatcher needed. Click 'Run Agent Now' to see it live!",
          side: "top",
          onNextClick: () => {
            driverObj.destroy();
            onComplete();
          },
        },
      },
    ],
  });

  driverObj.drive();
};
