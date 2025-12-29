#!/usr/bin/env node

/**
 * Update Bundle Type for All Bundles
 *
 * Sets the "Bundle Type" property to "Book" for all existing bundle records.
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

async function updateBundleType() {
  console.log('📝 Updating Bundle Type to "Book" for all bundles...\n');

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

    let totalUpdated = 0;
    let failed = 0;

    // Update each page
    for (const page of allBundlePages) {
        try {
          const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';

          // First, check what type the Bundle Type property is
          if (!page.properties['Bundle Type']) {
            console.log(`  ⚠️  No Bundle Type property found for: ${title}`);
            failed++;
            continue;
          }

          const propertyType = page.properties['Bundle Type'].type;

          // Prepare the update based on property type
          let bundleTypeUpdate;
          if (propertyType === 'select') {
            bundleTypeUpdate = { select: { name: 'Book' } };
          } else if (propertyType === 'rich_text') {
            bundleTypeUpdate = { rich_text: [{ text: { content: 'Book' } }] };
          } else {
            console.log(`  ⚠️  Unknown property type "${propertyType}" for: ${title}`);
            failed++;
            continue;
          }

          await notion.pages.update({
            page_id: page.id,
            properties: {
              'Bundle Type': bundleTypeUpdate
            }
          });

          totalUpdated++;
          console.log(`  ✓ Updated: ${title}`);
        } catch (error) {
          const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
          console.error(`  ✗ Failed to update "${title}": ${error.message}`);
          failed++;
        }
      }

    console.log(`\n🎉 Update complete!`);
    console.log(`   • Successfully updated: ${totalUpdated}`);
    console.log(`   • Failed: ${failed}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the update
updateBundleType().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
