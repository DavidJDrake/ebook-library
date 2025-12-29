#!/usr/bin/env node

/**
 * Backup Humble Bundles Database
 *
 * Exports all bundles from the Notion database to a JSON file.
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

async function backupBundlesDatabase() {
  console.log('💾 Backing up Humble Bundles database...\n');

  try {
    // Get all pages from the database using search with pagination
    console.log('📄 Finding all bundles...');
    let allBundlePages = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const response = await notion.search({
        filter: {
          value: 'page',
          property: 'object'
        },
        page_size: 100,
        start_cursor: startCursor
      });

      // Filter to only pages from our bundles database
      const bundlePages = response.results.filter(page =>
        page.parent && page.parent.database_id === BUNDLES_DB_ID
      );

      allBundlePages = allBundlePages.concat(bundlePages);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    console.log(`   Found ${allBundlePages.length} bundles\n`);

    // Extract relevant data from each bundle
    const bundles = allBundlePages.map(page => {
      const name = page.properties.Name?.title?.[0]?.plain_text || '';
      const bundleName = page.properties['Bundle Name']?.rich_text?.[0]?.plain_text || '';
      const purchaseDate = page.properties['Purchase Date']?.date?.start || null;
      const price = page.properties.Price?.number || 0;
      const bundleTypes = page.properties['Bundle Type']?.multi_select?.map(t => t.name) || [];

      return {
        id: page.id,
        name,
        bundleName,
        purchaseDate,
        price,
        bundleTypes,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time
      };
    });

    // Sort by purchase date (oldest first)
    bundles.sort((a, b) => {
      if (!a.purchaseDate) return 1;
      if (!b.purchaseDate) return -1;
      return new Date(a.purchaseDate) - new Date(b.purchaseDate);
    });

    // Create backup object with metadata
    const backup = {
      backup_date: new Date().toISOString(),
      database_id: BUNDLES_DB_ID,
      total_bundles: bundles.length,
      bundles: bundles
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `humble-bundles-backup-${timestamp}.json`;
    const backupDir = path.join(__dirname, 'backups');

    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
      console.log('📁 Created backups directory\n');
    }

    const filepath = path.join(backupDir, filename);

    // Write to file
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

    console.log(`✅ Backup complete!`);
    console.log(`   • File: ${filepath}`);
    console.log(`   • Bundles backed up: ${bundles.length}`);
    console.log(`   • File size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);

    // Also create a CSV backup for easier viewing
    const csvFilename = `humble-bundles-backup-${timestamp}.csv`;
    const csvFilepath = path.join(backupDir, csvFilename);

    const csvLines = [
      'Name,Purchase Date,Price,Bundle Types,ID'
    ];

    bundles.forEach(bundle => {
      const types = bundle.bundleTypes.join('; ');
      const line = `"${bundle.name}","${bundle.purchaseDate}",${bundle.price},"${types}","${bundle.id}"`;
      csvLines.push(line);
    });

    fs.writeFileSync(csvFilepath, csvLines.join('\n'), 'utf-8');

    console.log(`\n📊 CSV backup also created!`);
    console.log(`   • File: ${csvFilepath}`);
    console.log(`   • File size: ${(fs.statSync(csvFilepath).size / 1024).toFixed(2)} KB`);

    console.log(`\n💡 Backup files saved to: ${backupDir}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the backup
backupBundlesDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
