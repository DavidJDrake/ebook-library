#!/usr/bin/env node

/**
 * Backup Notion Database Skill
 *
 * Creates file-based backups of a Notion database in JSON and CSV formats.
 *
 * Usage: /backup-notion-db <database_id>
 *
 * This skill will:
 * 1. Retrieve all entries from the database
 * 2. Export to timestamped JSON file (full data with metadata)
 * 3. Export to timestamped CSV file (readable summary)
 * 4. Save backups to ./backups/ directory
 *
 * NOTE: Due to Notion API limitations, creating database copies within Notion
 * programmatically is not reliable. For Notion-to-Notion backups, use Notion's
 * built-in duplicate feature (right-click database > Duplicate).
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const databaseId = args[0];

if (!databaseId) {
  console.error('❌ Error: Database ID is required');
  console.error('Usage: /backup-notion-db <database_id>');
  process.exit(1);
}

if (!process.env.NOTION_TOKEN) {
  console.error('❌ Error: NOTION_TOKEN environment variable is required');
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function backupNotionDatabase() {
  console.log('💾 Starting Notion database backup...\n');

  try {
    // Step 1: Get database info
    console.log('📊 Retrieving database information...');
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const dbTitle = db.title?.[0]?.plain_text || 'Untitled Database';
    console.log(`   Database: "${dbTitle}"`);
    console.log(`   ID: ${databaseId}\n`);

    // Step 2: Get all pages from the database
    console.log('📄 Fetching all entries...');
    let allPages = [];
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

      const pages = response.results.filter(page =>
        page.parent && page.parent.database_id === databaseId
      );

      allPages = allPages.concat(pages);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    console.log(`   Found ${allPages.length} entries\n`);

    // Step 3: Extract data for backup
    console.log('🔄 Processing entries...');
    const entries = allPages.map(page => {
      const entry = {
        id: page.id,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
        properties: {}
      };

      // Extract property values
      for (const [key, prop] of Object.entries(page.properties)) {
        if (prop.type === 'title') {
          entry.properties[key] = prop.title?.[0]?.plain_text || '';
        } else if (prop.type === 'rich_text') {
          entry.properties[key] = prop.rich_text?.[0]?.plain_text || '';
        } else if (prop.type === 'number') {
          entry.properties[key] = prop.number || 0;
        } else if (prop.type === 'date') {
          entry.properties[key] = prop.date?.start || null;
        } else if (prop.type === 'multi_select') {
          entry.properties[key] = prop.multi_select?.map(item => item.name) || [];
        } else if (prop.type === 'select') {
          entry.properties[key] = prop.select?.name || null;
        } else {
          // Store raw value for other types
          entry.properties[key] = prop[prop.type];
        }
      }

      return entry;
    });

    // Step 4: Create backup object with metadata
    const backup = {
      backup_date: new Date().toISOString(),
      database_id: databaseId,
      database_name: dbTitle,
      total_entries: entries.length,
      entries: entries
    };

    // Step 5: Generate filenames with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const safeDbName = dbTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const baseFilename = `${safeDbName}-backup-${timestamp}`;
    const backupDir = path.join(process.cwd(), 'backups');

    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('📁 Created backups directory\n');
    }

    // Step 6: Write JSON backup
    const jsonFilepath = path.join(backupDir, `${baseFilename}.json`);
    fs.writeFileSync(jsonFilepath, JSON.stringify(backup, null, 2), 'utf-8');

    console.log(`✅ JSON backup created!`);
    console.log(`   • File: ${jsonFilepath}`);
    console.log(`   • Entries: ${entries.length}`);
    console.log(`   • Size: ${(fs.statSync(jsonFilepath).size / 1024).toFixed(2)} KB`);

    // Step 7: Create CSV backup
    const csvFilepath = path.join(backupDir, `${baseFilename}.csv`);
    const csvLines = [];

    // CSV header - use property names from first entry
    if (entries.length > 0) {
      const propertyNames = Object.keys(entries[0].properties);
      csvLines.push(propertyNames.map(name => `"${name}"`).join(','));

      // CSV rows
      entries.forEach(entry => {
        const values = propertyNames.map(name => {
          const value = entry.properties[name];
          if (Array.isArray(value)) {
            return `"${value.join('; ')}"`;
          } else if (value === null || value === undefined) {
            return '""';
          } else {
            return `"${String(value).replace(/"/g, '""')}"`;
          }
        });
        csvLines.push(values.join(','));
      });

      fs.writeFileSync(csvFilepath, csvLines.join('\n'), 'utf-8');

      console.log(`\n📊 CSV backup created!`);
      console.log(`   • File: ${csvFilepath}`);
      console.log(`   • Size: ${(fs.statSync(csvFilepath).size / 1024).toFixed(2)} KB`);
    }

    console.log(`\n💡 Backup files saved to: ${backupDir}`);
    console.log(`\n📌 For Notion-to-Notion backups:`);
    console.log(`   Open the database in Notion, click the ⋯ menu, and select "Duplicate"`);

  } catch (error) {
    if (error.code === 'object_not_found') {
      console.error('❌ Error: Database not found. Make sure:');
      console.error('   1. The database ID is correct');
      console.error('   2. The database is shared with your Notion integration');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the backup
backupNotionDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
