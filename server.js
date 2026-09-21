import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;
const distPath = path.join(__dirname, 'dist');
const indexHtmlPath = path.join(distPath, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.log('dist/index.html not found! Running vite build automatically...');
  try {
    execSync('npx vite build', { stdio: 'inherit', cwd: __dirname });
    console.log('Vite build completed successfully!');
  } catch (err) {
    console.error('Failed to run automatic vite build:', err);
  }
}
app.use(express.static(distPath));
app.use((req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    res.sendFile(indexHtmlPath);
  } else {
    res.status(503).send('Building application, please refresh in a moment...');
  }
});
app.listen(PORT, () => {
  console.log(`PDFCraft server running on port ${PORT}`);
});