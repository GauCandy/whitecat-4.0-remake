const fs = require('fs');
const path = require('path');

/**
 * Copy static assets (locales and public files) to dist directory
 */

const srcLocalesDir = path.join(__dirname, '..', 'src', 'locales');
const distLocalesDir = path.join(__dirname, '..', 'dist', 'locales');
const srcPublicDir = path.join(__dirname, '..', 'public');
const distPublicDir = path.join(__dirname, '..', 'dist', 'public');

function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read all items in source directory
  const items = fs.readdirSync(src, { withFileTypes: true });

  for (const item of items) {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);

    if (item.isDirectory()) {
      // Recursively copy directory
      copyDir(srcPath, destPath);
    } else if (item.isFile() && (item.name.endsWith('.json') || item.name.endsWith('.md') || item.name.endsWith('.html') || item.name.endsWith('.css'))) {
      // Copy JSON, MD, HTML, and CSS files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // Copy locale files
  copyDir(srcLocalesDir, distLocalesDir);
  console.log('✅ Locale files copied to dist/');

  // Copy public files (if exists)
  if (fs.existsSync(srcPublicDir)) {
    copyDir(srcPublicDir, distPublicDir);
    console.log('✅ Public files copied to dist/');
  }
} catch (error) {
  console.error('❌ Failed to copy static assets:', error);
  process.exit(1);
}
