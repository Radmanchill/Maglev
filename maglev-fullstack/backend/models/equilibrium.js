function computeEquilibrium(setpoint, params) {
  // gap including offset
  const gap = setpoint + params.y_offset;

  // equilibrium current (from force balance: mg = k*i^2 / gap^2)
  const i_eq = Math.sqrt(
    (params.m * params.g * gap * gap) / params.k
  );

  // equilibrium voltage (steady state: u = R*i)
  const u_eq = params.R * i_eq;

  return { i_eq, u_eq };
}

module.exports = { computeEquilibrium };
