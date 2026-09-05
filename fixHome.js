const fs = require('fs');
const path = 'G:\\New folder (4)\\src\\pages\\Home.tsx';
let content = fs.readFileSync(path, 'utf8');
// Replace the broken placeholder block with a clean version
const pattern = /<div className="md:w-1\/2 flex justify-center">[\s\S]*?<\/div>/g;
const replacement = `<div className="md:w-1/2 flex justify-center"><div className="w-64 h-64 bg-gray-700 rounded-full flex items-center justify-center"><div className="w-12 h-12 bg-accent rounded-full"></div></div></div>`;
content = content.replace(pattern, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed Home.tsx');