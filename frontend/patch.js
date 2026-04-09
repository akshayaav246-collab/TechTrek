const fs = require('fs');
const loaderCss = fs.readFileSync('src/components/ui/Loader.css', 'utf8');
let globals = fs.readFileSync('src/app/globals.css', 'utf8');
if (!globals.includes('loader-overlay')) {
  fs.writeFileSync('src/app/globals.css', globals.trimEnd() + '\n\n' + loaderCss + '\n');
  console.log('Loader CSS injected into globals.css');
} else {
  console.log('Already present');
}
