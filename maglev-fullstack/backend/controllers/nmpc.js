const { maglevDynamics } = require("../models/maglev");

function simulateNMPC(setpoint) {
  const params = {
  m: 0.05,
  g: 9.81,
  k: 2e-5,

  c: 15,        // damping
  y_offset: 0.002, // avoids singularity

  R: 2.0,       // coil resistance
  L: 0.02,      // inductance

  y_min: 0.005,
};


  const dt = 0.002;
  const T = 2.0;
  const steps = Math.floor(T / dt);

  // NMPC parameters
  const Np = 20;        // prediction horizon
  const u_eq = 31;      // equilibrium current
  const u_min = 0;
  const u_max = 60;
  const Q = 2000;       // tracking weight
  const R = 0.1;        // control effort weight

let x = [0.03, 0, 30]; // position, velocity, current


  const time = [];
  const position = [];
  const velocity = [];
  const current = [];

  // helper: simulate one step
  function step(x, u) {
    const dx = maglevDynamics(x, u, params);
    let xn = [
  x[0] + dt * dx[0],
  x[1] + dt * dx[1],
  x[2] + dt * dx[2],
];

    xn[0] = Math.max(params.y_min, xn[0]);
    return xn;
  }

  // brute-force optimizer around equilibrium
  function optimizeControl(x0) {
    let bestU = u_eq;
    let bestCost = Infinity;

    // test candidates around equilibrium
    for (let du = -15; du <= 15; du += 1) {
      let u = u_eq + du;
      u = Math.max(u_min, Math.min(u_max, u));

      let xpred = [...x0];
      let cost = 0;

      for (let k = 0; k < Np; k++) {
        xpred = step(xpred, u);
        const err = setpoint - xpred[0];
        cost += Q * err * err + R * u * u;
      }

      if (cost < bestCost) {
        bestCost = cost;
        bestU = u;
      }
    }

    return bestU;
  }

  // main NMPC loop
  for (let i = 0; i < steps; i++) {
    const t = i * dt;

    const u = optimizeControl(x);
    const dx = maglevDynamics(x, u, params);

    x = [
      x[0] + dt * dx[0],
      x[1] + dt * dx[1],
    ];

    x[0] = Math.max(params.y_min, x[0]);

    time.push(t);
    position.push(x[0]);
    velocity.push(x[1]);
    current.push(x[2]);
  }

  return { time, position, velocity, current };
}

module.exports = { simulateNMPC };
