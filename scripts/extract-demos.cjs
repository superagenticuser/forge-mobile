// Extract ANIMS data from web app's demo.js
const fs = require('fs');
const path = require('path');

const demoPath = path.join(__dirname, '../../gym-3d-v10/js/demo.js');
const content = fs.readFileSync(demoPath, 'utf8');

// Extract the IIFE body and evaluate the parts we need
// We need: D, S, XD, X, lerpJ, ANIMS

// Create a sandbox to evaluate
const sandbox = {};
const vm = require('vm');

// Extract just the definitions we need (before the IIFE closes)
// The structure is: (function() { "use strict"; const D=...; function S...; ...; const ANIMS={...}; ... })();
// We'll extract from start to the ANIMS definition end

// Find ANIMS definition
const animsStart = content.indexOf('const ANIMS = {');
if (animsStart === -1) {
  console.error('ANIMS not found');
  process.exit(1);
}

// Find the matching closing brace for ANIMS
// Count braces from animsStart
let braceCount = 0;
let inString = false;
let stringChar = '';
let animsEnd = -1;

for (let i = animsStart; i < content.length; i++) {
  const c = content[i];
  if (!inString && (c === '"' || c === "'" || c === '`')) {
    inString = true;
    stringChar = c;
  } else if (inString && c === stringChar && content[i-1] !== '\\') {
    inString = false;
  } else if (!inString) {
    if (c === '{') braceCount++;
    else if (c === '}') {
      braceCount--;
      if (braceCount === 0) {
        // Found the end, but need to include the semicolon
        animsEnd = i + 1;
        break;
      }
    }
  }
  // The ANIMS starts with "const ANIMS = {", so first { increments to 1
  if (i === animsStart + 'const ANIMS = '.length && c === '{') {
    // Already counted
  }
}

if (animsEnd === -1) {
  console.error('Could not find ANIMS end');
  process.exit(1);
}

// Extract the preamble (D, S, XD, X, lerpJ) and ANIMS
// The preamble is from the start of the IIFE to ANIMS
const iifeStart = content.indexOf('(function () {');
const preamble = content.substring(iifeStart, animsStart);
const animsDef = content.substring(animsStart, animsEnd);

// Create a script that defines the helpers and ANIMS, then exports ANIMS
const script = `
${preamble}
${animsDef}
module.exports = ANIMS;
`;

// Write to a temp file and require it
const tmpPath = path.join(__dirname, 'anims-extract-tmp.cjs');
fs.writeFileSync(tmpPath, script);

try {
  const ANIMS = require(tmpPath);
  const keys = Object.keys(ANIMS);
  console.log(`Extracted ${keys.length} animations`);
  console.log('Sample keys:', keys.slice(0, 10).join(', '));
  
  // Write as JSON
  const outPath = path.join(__dirname, '../../forge-mobile/src/data/exerciseDemos.json');
  fs.writeFileSync(outPath, JSON.stringify(ANIMS, null, 2));
  console.log(`Written to ${outPath}`);
} finally {
  fs.unlinkSync(tmpPath);
}
