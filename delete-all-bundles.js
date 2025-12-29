#!/usr/bin/env node

/**
 * Delete All Bundles from Notion Database
 *
 * This script deletes all entries from the Humble Bundles database.
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

async function deleteAllBundles() {
  console.log('🗑️  Deleting all bundles from Notion database...\n');

  try {
    // Query all pages in the database
    let hasMore = true;
    let startCursor = undefined;
    let totalDeleted = 0;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: BUNDLES_DB_ID,
        start_cursor: startCursor,
        page_size: 100
      });

      console.log(`Found ${response.results.length} bundles in this batch...`);

      // Delete each page
      for (const page of response.results) {
        try {
          await notion.pages.update({
            page_id: page.id,
            archived: true
          });
          totalDeleted++;

          // Get the title for logging
          const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
          console.log(`  ✓ Deleted: ${title}`);
        } catch (error) {
          console.error(`  ✗ Failed to delete page: ${error.message}`);
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    console.log(`\n🎉 Successfully deleted ${totalDeleted} bundles!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the deletion
deleteAllBundles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
