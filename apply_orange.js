const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function processFile(filePath) {
  if (!filePath.match(/\.(tsx?|jsx?|css)$/)) return;
  const original = fs.readFileSync(filePath, 'utf8');
  let content = original;

  content = content.replace(/#E8831A/gi, '#e8631a');
  content = content.replace(/#f97316/gi, '#e8631a');

  content = content.replace(/\btext-orange-[0-9]{3}\b/g, 'text-[#e8631a]');
  content = content.replace(/\bbg-orange-[0-9]{3}\b/g, 'bg-[#e8631a]');
  content = content.replace(/\bborder-orange-[0-9]{3}\b/g, 'border-[#e8631a]');
  content = content.replace(/\bfrom-orange-[0-9]{3}\b/g, 'from-[#e8631a]');
  content = content.replace(/\bto-orange-[0-9]{3}\b/g, 'to-[#e8631a]');
  content = content.replace(/\bring-orange-[0-9]{3}\b/g, 'ring-[#e8631a]');
  content = content.replace(/\bhover:text-orange-[0-9]{3}\b/g, 'hover:text-[#e8631a]');
  content = content.replace(/\bhover:bg-orange-[0-9]{3}\b/g, 'hover:bg-[#e8631a]');
  content = content.replace(/\bhover:border-orange-[0-9]{3}\b/g, 'hover:border-[#e8631a]');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated: ' + filePath);
  }
}

walkDir('./frontend/src', processFile);
