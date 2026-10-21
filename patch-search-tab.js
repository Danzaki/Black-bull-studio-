const fs = require("fs");
const f = "app/search/page.tsx";
let s = fs.readFileSync(f, "utf8");
const find = "const [activeTab, setActiveTab] = useState<'people' | 'posts'>('people');";
if (s.split(find).length !== 2) { console.error("ABORT: layin bai yi daidai ba"); process.exit(1); }
if (s.includes("searchParams.get('tab')")) { console.error("ABORT: an riga an gyara"); process.exit(1); }
fs.writeFileSync(f + ".bak", s);
s = s.replace(find, () => "const [activeTab, setActiveTab] = useState<'people' | 'posts'>(searchParams.get('tab') === 'posts' ? 'posts' : 'people');");
fs.writeFileSync(f, s);
console.log("OK");
