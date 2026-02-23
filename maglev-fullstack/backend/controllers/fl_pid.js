const { maglevDynamics } = require("../models/maglev");
const { computeEquilibrium } = require("../models/equilibrium");

function simulateFLPID(setpoint) {
  const params = {
    m: 0.05,
    g: 9.81,
    k: 2e-5,

    c: 8,               // realistic damping
    y_offset: 0.002,

    R: 2.0,
    L: 0.02,

    y_min: 0.005,
  };

  const dt = 0.001;
  const T = 2.0;
  const steps = Math.floor(T / dt);

  // equilibrium
  const { i_eq, u_eq } = computeEquilibrium(setpoint, params);

  // initial state at equilibrium
  let x = [setpoint, 0, i_eq];

  // base PID gains
  const Kp = 120;
  const Ki = 40;
  const Kd = 12;

  let integral = 0;

  const time = [];
  const position = [];
  const velocity = [];
  const current = [];

  for (let i = 0; i < steps; i++) {
    const t = i * dt;

    const e = setpoint - x[0];
    const edot = -x[1];

    integral += e * dt;

    // fuzzy-like gain scheduling (simple & stable)
    const gainScale = 1 + Math.min(Math.abs(e) * 20, 1.5);

    const du =
      gainScale * (
        Kp * e +
        Ki * integral +
        Kd * edot
      );

    let u = u_eq + du;

    // voltage limits
    u = Math.max(0, Math.min(u, 50));

    const dx = maglevDynamics(x, u, params);

    x = [
      x[0] + dt * dx[0],
      x[1] + dt * dx[1],
      x[2] + dt * dx[2],
    ];

    // safety clamps
    x[0] = Math.max(params.y_min, Math.min(x[0], 0.05));
    x[2] = Math.max(0, Math.min(x[2], 25));

    time.push(t);
    position.push(x[0]);
    velocity.push(x[1]);
    current.push(x[2]);
  }

  return { time, position, velocity, current };
}

module.exports = { simulateFLPID };
