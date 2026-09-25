const fs = require('fs');
fs.mkdirSync('C:/Users/Devi/OneDrive/Desktop/DIGIIDGEN/digital-id-vite/src/pages', { recursive: true });
const copyAndTransform = (src, dest) => {
  let content = fs.readFileSync(src, 'utf-8');
  content = content.replace(/import Link from 'next\/link';/g, "import { Link } from 'react-router-dom';");
  content = content.replace(/\"use client\";\r?\n/g, '');
  if (dest.includes('App.tsx')) {
    content = content.replace(/export default function ScrollyTelling/g, 'export default function App');
  }
  fs.writeFileSync(dest, content);
};
copyAndTransform('C:/Users/Devi/OneDrive/Desktop/DIGIIDGEN/digital-id-generator/app/dashboard/page.tsx', 'C:/Users/Devi/OneDrive/Desktop/DIGIIDGEN/digital-id-vite/src/pages/Dashboard.tsx');
copyAndTransform('C:/Users/Devi/OneDrive/Desktop/DIGIIDGEN/digital-id-generator/app/signup/page.tsx', 'C:/Users/Devi/OneDrive/Desktop/DIGIIDGEN/digital-id-vite/src/pages/Signup.tsx');
copyAndTransform('C:/Users/Devi/OneDrive/Desktop/DIGIIDGEN/digital-id-generator/app/auth/page.tsx', 'C:/Users/Devi/OneDrive/Desktop/DIGIIDGEN/digital-id-vite/src/pages/Auth.tsx');
copyAndTransform('C:/Users/Devi/OneDrive/Desktop/DIGIIDGEN/digital-id-generator/app/components/ScrollyTelling.tsx', 'C:/Users/Devi/OneDrive/Desktop/DIGIIDGEN/digital-id-vite/src/App.tsx');
