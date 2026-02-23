import MaglevModule from "./maglev.js";

export async function loadMaglev() {
  const Module = await MaglevModule({
    locateFile: (path) => {
      if (path.endsWith(".wasm")) return "/maglev.wasm";
      return path;
    },
  });

  return Module;
}
