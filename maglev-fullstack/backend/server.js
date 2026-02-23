const express = require("express");
const cors = require("cors");

const { simulateNMPC } = require("./controllers/nmpc");

const { simulatePID } = require("./controllers/pid");
const { simulateFLPID } = require("./controllers/fl_pid");
const { simulateLQR } = require("./controllers/lqr");

const app = express();
app.use(cors());
app.use(express.json());




/* ------------------------------
   API endpoint
------------------------------ */
app.post("/simulate", (req, res) => {
  const controller = req.body.controller || "pid";
  const setpoint = req.body.setpoint || 0.02;

  console.log("Requested controller:", controller);

  let result;

  try {
    if (controller === "pid") {
      result = simulatePID(setpoint);
    } else if (controller === "fl_pid") {
      result = simulateFLPID(setpoint);
    } else if (controller === "lqr") {
      result = simulateLQR(setpoint);
    } else if (controller === "nmpc") {
      result = simulateNMPC(setpoint);
    } else {
      console.log("Unknown controller, defaulting to PID");
      result = simulatePID(setpoint);
    }

    res.json(result);
  } catch (err) {
    console.error("Simulation error:", err);
    res.status(500).json({ error: "Simulation failed" });
  }
});



app.get("/", (req, res) => {
  res.send("MAGLEV backend running");
});


/* ------------------------------
   Start server
------------------------------ */
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
