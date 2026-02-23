const { maglevDynamics } = require("../models/maglev");

function simulateLQR(setpoint) {
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


  const dt = 0.001;
  const T = 2.0;
  const steps = Math.floor(T / dt);

let x = [0.03, 0, 30]; // position, velocity, current


  // Pre-tuned LQR-like gains
  const K = [1200, 80];
  const u_eq = 31;

  const time = [];
  const position = [];
  const velocity = [];
  const current = [];

  for (let i = 0; i < steps; i++) {
    const t = i * dt;

    const errorPos = x[0] - setpoint;
    const errorVel = x[1];

    const u = u_eq - (K[0] * errorPos + K[1] * errorVel);

    const dx = maglevDynamics(x, u, params);

    x = [
  x[0] + dt * dx[0],
  x[1] + dt * dx[1],
  x[2] + dt * dx[2],
];


    x[0] = Math.max(params.y_min, x[0]);

    time.push(t);
    position.push(x[0]);
    velocity.push(x[1]);
    current.push(x[2]);
  }

  return { time, position, velocity, current };
}

module.exports = { simulateLQR };
