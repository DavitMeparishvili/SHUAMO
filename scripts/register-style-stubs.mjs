import { registerHooks } from "node:module";

// Backend seed scripts import the modules' public barrels, which also export
// React components. Node does not load stylesheets; seeds never render UI.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".css")) {
      return {
        format: "module",
        source: "export default {};",
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});
