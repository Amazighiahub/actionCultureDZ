const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

async function cleanOrphanFiles() {
  const config = require('../config/database');
  const sequelize = config.createDatabaseConnection();

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const subdirs = ['images', 'documents', 'videos', 'audio'];

  let totalFiles = 0;
  let orphanFiles = 0;
  let freedBytes = 0;
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('=== DRY RUN MODE — no files will be deleted ===\n');
  }

  try {
    await sequelize.authenticate();
    console.log('Database connection established.\n');
  } catch (err) {
    console.error('Cannot connect to database:', err.message);
    process.exit(1);
  }

  for (const subdir of subdirs) {
    const dirPath = path.join(uploadsDir, subdir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      totalFiles++;
      const filePath = `/uploads/${subdir}/${file}`;

      // Check if referenced in any table that stores file paths
      const [results] = await sequelize.query(
        `SELECT COUNT(*) as count FROM (
          SELECT photo_url as url FROM user WHERE photo_url LIKE :pattern
          UNION ALL SELECT url FROM media WHERE url LIKE :pattern
          UNION ALL SELECT chemin_fichier as url FROM lieu_media WHERE chemin_fichier LIKE :pattern
        ) AS refs`,
        { replacements: { pattern: `%${file}%` } }
      );

      if (results[0].count === 0) {
        orphanFiles++;
        const fullPath = path.join(dirPath, file);
        const stats = fs.statSync(fullPath);
        freedBytes += stats.size;

        if (!dryRun) {
          fs.unlinkSync(fullPath);
        }
        console.log(
          `${dryRun ? '[DRY RUN] ' : ''}Deleted orphan: ${filePath} (${(stats.size / 1024).toFixed(1)} KB)`
        );
      }
    }
  }

  console.log(
    `\nSummary: ${orphanFiles}/${totalFiles} orphan files, ` +
    `${(freedBytes / 1024 / 1024).toFixed(1)} MB ${dryRun ? 'would be ' : ''}freed`
  );

  await sequelize.close();
}

cleanOrphanFiles().catch(console.error);
