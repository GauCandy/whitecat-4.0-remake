import archiver from 'archiver';
import { createWriteStream, existsSync, unlinkSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const mode = process.argv[2]; // 'prod' or 'source'

async function createArchive() {
  // Format: YYYY-MM-DD-HH-MM-SS
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '-').split('.')[0];
  const archivesDir = join(process.cwd(), 'archives');

  // Ensure archives directory exists
  if (!existsSync(archivesDir)) {
    await mkdir(archivesDir, { recursive: true });
  }

  if (mode === 'prod') {
    await archiveProduction(archivesDir, timestamp);
  } else if (mode === 'source') {
    await archiveSource(archivesDir, timestamp);
  } else {
    console.log('Usage: npm run archive:prod | npm run archive:source');
    process.exit(1);
  }
}

/**
 * Archive production build (for deployment)
 */
async function archiveProduction(archivesDir: string, timestamp: string) {
  const outputPath = join(archivesDir, `whitecat-prod-${timestamp}.zip`);

  // Delete old file if exists
  if (existsSync(outputPath)) {
    console.log(`🗑️  Deleting old file: ${outputPath}`);
    unlinkSync(outputPath);
  }

  const output = createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  console.log('📦 Creating production archive...');

  // Check if dist exists
  if (!existsSync(join(process.cwd(), 'dist'))) {
    console.error('❌ Error: dist/ folder not found. Run "npm run build" first!');
    process.exit(1);
  }

  output.on('close', () => {
    const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`✅ Production archive created: ${outputPath}`);
    console.log(`📊 Size: ${sizeMB} MB`);
    console.log('\n📋 Contents:');
    console.log('   - dist/ (compiled JavaScript)');
    console.log('   - database/ (schema files)');
    console.log('   - web/ (web server files)');
    console.log('   - package.json');
    console.log('   - .env.example');
    console.log('   - README.md');
    console.log('\n🚀 Ready to deploy to hosting!');
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  // Add production files
  archive.directory('dist/', 'dist');
  archive.directory('database/', 'database');
  archive.directory('web/', 'web');
  archive.file('package.json', { name: 'package.json' });
  archive.file('.env.example', { name: '.env.example' });
  archive.file('README.md', { name: 'README.md' });

  if (existsSync('package-lock.json')) {
    archive.file('package-lock.json', { name: 'package-lock.json' });
  }

  await archive.finalize();
}

/**
 * Archive source code (for backup/sharing)
 */
async function archiveSource(archivesDir: string, timestamp: string) {
  const outputPath = join(archivesDir, `whitecat-source-${timestamp}.zip`);

  // Delete old file if exists
  if (existsSync(outputPath)) {
    console.log(`🗑️  Deleting old file: ${outputPath}`);
    unlinkSync(outputPath);
  }

  const output = createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  console.log('📦 Creating source code archive...');

  output.on('close', () => {
    const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`✅ Source archive created: ${outputPath}`);
    console.log(`📊 Size: ${sizeMB} MB`);
    console.log('\n📋 Contents:');
    console.log('   - src/ (TypeScript source)');
    console.log('   - database/ (schema files)');
    console.log('   - web/ (web server files)');
    console.log('   - All config files');
    console.log('   - README.md');
    console.log('\n💾 Source code backup complete!');
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  // Add source files
  archive.directory('src/', 'src');
  archive.directory('database/', 'database');
  archive.directory('web/', 'web');

  // Config files
  archive.file('package.json', { name: 'package.json' });
  archive.file('tsconfig.json', { name: 'tsconfig.json' });
  archive.file('.eslintrc.json', { name: '.eslintrc.json' });
  archive.file('.prettierrc', { name: '.prettierrc' });
  archive.file('.gitignore', { name: '.gitignore' });
  archive.file('.env.example', { name: '.env.example' });
  archive.file('README.md', { name: 'README.md' });

  if (existsSync('ARCHITECTURE.md')) {
    archive.file('ARCHITECTURE.md', { name: 'ARCHITECTURE.md' });
  }

  if (existsSync('Discord_Bot_Roadmap.md')) {
    archive.file('Discord_Bot_Roadmap.md', { name: 'Discord_Bot_Roadmap.md' });
  }

  if (existsSync('package-lock.json')) {
    archive.file('package-lock.json', { name: 'package-lock.json' });
  }

  await archive.finalize();
}

createArchive().catch((err) => {
  console.error('❌ Error creating archive:', err);
  process.exit(1);
});
