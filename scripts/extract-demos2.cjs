// Extract ANIMS by running demo.js in a VM and capturing the ANIMS variable
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const demoPath = path.join('/home/hatch/workspace/gym-3d-v10/js/demo.js');
let content = fs.readFileSync(demoPath, 'utf8');

// The demo.js is: (function() { "use strict"; ...; const ANIMS = {...}; ...; })();
// We want to capture ANIMS. Let's modify to expose it.
// Find the end of the IIFE and inject an export

// Simpler: wrap the content to capture ANIMS
// Replace the closing of IIFE with code that saves ANIMS

// The IIFE ends with })(); - we'll replace the last occurrence
const lastIIFEClose = content.lastIndexOf('})();');
if (lastIIFEClose === -1) {
  console.error('IIFE close not found');
  process.exit(1);
}

// Inject: before the close, add global.__ANIMS = ANIMS (if ANIMS is in scope)
const injected = content.substring(0, lastIIFEClose) + 
  '\n;global.__ANIMS = (typeof ANIMS !== "undefined") ? ANIMS : null;\n' +
  content.substring(lastIIFEClose);

const sandbox = { 
  global: {}, 
  console, 
  Math, 
  Object, 
  Array,
  window: {},
  document: { createElement: () => ({ getContext: () => null }) },
};
vm.createContext(sandbox);

try {
  vm.runInContext(injected, sandbox, { filename: 'demo.js' });
  const ANIMS = sandbox.global.__ANIMS;
  if (!ANIMS) {
    console.error('ANIMS not captured');
    process.exit(1);
  }
  const keys = Object.keys(ANIMS);
  console.log(`Extracted ${keys.length} animations`);
  
  const outPath = '/home/hatch/workspace/forge-mobile/src/data/exerciseDemos.json';
  fs.writeFileSync(outPath, JSON.stringify(ANIMS, null, 2));
  console.log(`Written to ${outPath} (${fs.statSync(outPath).size} bytes)`);
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
