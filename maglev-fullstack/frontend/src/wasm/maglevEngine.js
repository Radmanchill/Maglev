import MaglevModule from "./maglev.js";

class MaglevEngine {
  async init(setpoint) {
    this.wasm = await MaglevModule();

    this.eqCurrent = this.wasm.cwrap(
      "equilibrium_current",
      "number",
      ["number"]
    );

    this.eqVoltage = this.wasm.cwrap(
      "equilibrium_voltage",
      "number",
      ["number"]
    );

    this.stepFn = this.wasm.cwrap(
      "step",
      null,
      ["number", "number", "number"]
    );

    this.dt = 0.001;
    this.setpoint = setpoint;

    this.y = setpoint;
    this.v = 0;
    this.i = this.eqCurrent(setpoint);
    this.u_eq = this.eqVoltage(setpoint);
  }

  step(u) {
    const ptr = this.wasm._malloc(3 * 8);

    this.wasm.HEAPF64[ptr / 8]     = this.y;
    this.wasm.HEAPF64[ptr / 8 + 1] = this.v;
    this.wasm.HEAPF64[ptr / 8 + 2] = this.i;

    this.stepFn(ptr, u, this.dt);

    this.y = this.wasm.HEAPF64[ptr / 8];
    this.v = this.wasm.HEAPF64[ptr / 8 + 1];
    this.i = this.wasm.HEAPF64[ptr / 8 + 2];

    this.wasm._free(ptr);

    return { y: this.y, v: this.v, i: this.i };
  }
}

export default MaglevEngine;
