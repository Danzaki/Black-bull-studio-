import fs from 'fs';
const f = 'app/terminal/preferences/page.tsx';
let s = fs.readFileSync(f, 'utf8');
const start = s.indexOf('<header className="sticky top-0 z-30');
const end = s.indexOf('</header>', start);
if (start === -1 || end === -1) { console.log('ba a samu ba'); process.exit(0); }
s = s.slice(0, start) + '<TerminalPageHeader title="Trading Preferences" />' + s.slice(end + '</header>'.length);
if (!s.includes('TerminalPageHeader from')) {
  const lines = s.split('\n');
  let last = 0;
  lines.forEach((l, i) => { if (/^import .* from /.test(l)) last = i; });
  lines.splice(last + 1, 0, 'import TerminalPageHeader from "@/components/layout/TerminalPageHeader";');
  s = lines.join('\n');
}
fs.writeFileSync(f, s);
console.log('an canza: preferences');
