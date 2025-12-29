#!/usr/bin/env node

/**
 * Import Bundles from bundles.txt file
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

async function importBundlesFromFile() {
  console.log('📚 Importing bundles from bundles.txt...\n');

  try {
    // Read the file
    const fileContent = fs.readFileSync('bundles.txt', 'utf-8');
    const lines = fileContent.trim().split('\n');

    console.log(`Found ${lines.length} lines in file\n`);

    let imported = 0;
    let failed = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        // Parse the line - format: "Name Date Price" or "Name Date --"
        // Example: "Humble Book Bundle: The Get-Your-Sh*t-Together Growth Bundle by HarperCollins Dec 9, 2025 $18.00"
        const match = line.match(/^(.+?)\s+([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})\s+([\$\d.]+|--|Gift)$/);

        if (!match) {
          console.log(`⚠️  Could not parse line: ${line.substring(0, 80)}...`);
          failed++;
          continue;
        }

        const bundleName = match[1].trim();
        const dateStr = match[2].trim();
        const priceStr = match[3].trim();

        // Parse date to YYYY-MM-DD
        let formattedDate = null;
        try {
          const dateObj = new Date(dateStr);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString().split('T')[0];
          }
        } catch (e) {
          console.log(`⚠️  Could not parse date for: ${bundleName}`);
        }

        // Parse price to number
        let priceNumber = 0;
        if (priceStr !== '--' && priceStr !== 'Gift') {
          const priceMatch = priceStr.match(/[\d.]+/);
          if (priceMatch) {
            priceNumber = parseFloat(priceMatch[0]);
          }
        }

        // Create Notion page
        await notion.pages.create({
          parent: { database_id: BUNDLES_DB_ID },
          properties: {
            'Name': {
              title: [{ text: { content: bundleName } }]
            },
            'Bundle Name': {
              rich_text: [{ text: { content: bundleName } }]
            },
            'Purchase Date': formattedDate ? {
              date: { start: formattedDate }
            } : { date: null },
            'Price': {
              number: priceNumber
            }
          }
        });

        imported++;
        console.log(`  ✓ Imported: ${bundleName} - $${priceNumber} (${dateStr})`);

      } catch (error) {
        console.error(`  ✗ Failed to import line: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n🎉 Import complete!`);
    console.log(`   • Successfully imported: ${imported}`);
    console.log(`   • Failed: ${failed}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the import
importBundlesFromFile().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
