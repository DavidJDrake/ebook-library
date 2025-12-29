#!/usr/bin/env node

/**
 * Calculate Total Spent on Humble Bundles
 *
 * Sums up all prices from the Humble Bundles database.
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

async function calculateTotalSpent() {
  console.log('💰 Calculating total spent on Humble Bundles...\n');

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

    // Calculate total
    let totalSpent = 0;
    let bundlesWithPrice = 0;
    let bundlesWithoutPrice = 0;

    console.log('📊 Processing bundles...\n');

    for (const page of allBundlePages) {
      const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
      const price = page.properties.Price?.number;

      if (price !== null && price !== undefined) {
        totalSpent += price;
        bundlesWithPrice++;
        console.log(`  ${title}: $${price.toFixed(2)}`);
      } else {
        bundlesWithoutPrice++;
        console.log(`  ${title}: (no price)`);
      }
    }

    console.log(`\n💵 Total Spent: $${totalSpent.toFixed(2)}`);
    console.log(`\n📊 Summary:`);
    console.log(`   • Total bundles: ${allBundlePages.length}`);
    console.log(`   • Bundles with price: ${bundlesWithPrice}`);
    console.log(`   • Bundles without price: ${bundlesWithoutPrice}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the calculation
calculateTotalSpent().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
