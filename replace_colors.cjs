const fs = require('fs');

let content = fs.readFileSync('./src/pages/TotemClock.jsx', 'utf8');

// Replace hex colors
content = content.replace(/#f97316/g, '#ef4444').replace(/#e66a14/g, '#dc2626');

// Replace Logo 1
const logo1 = `<div className="flex flex-col space-y-1">
              <div className="w-6 h-1.5 bg-[#ef4444] rounded-full"></div>
              <div className="w-6 h-1.5 bg-[#ef4444] rounded-full"></div>
              <div className="w-6 h-1.5 bg-[#ef4444] rounded-full"></div>
            </div>
            <span className="text-xl font-bold tracking-widest uppercase">N-Ponto</span>`;
const logo1_new = `<img src="/logo-white.png" alt="N-Ponto" className="h-8 w-auto object-contain" />`;

content = content.replace(logo1, logo1_new);

// Replace Logo 2
const logo2 = `<div className="flex flex-col space-y-1">
              <div className="w-5 h-1.5 bg-[#ef4444] rounded-full"></div>
              <div className="w-5 h-1.5 bg-[#ef4444] rounded-full"></div>
              <div className="w-5 h-1.5 bg-[#ef4444] rounded-full"></div>
            </div>
            <span className="text-lg font-bold tracking-widest uppercase">N-Ponto</span>`;
const logo2_new = `<img src="/logo-white.png" alt="N-Ponto" className="h-6 w-auto object-contain" />`;

content = content.replace(logo2, logo2_new);

fs.writeFileSync('./src/pages/TotemClock.jsx', content, 'utf8');
console.log('Replaced TotemClock colors and logos');
