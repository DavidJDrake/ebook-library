#!/usr/bin/env node

/**
 * Calculate Date Range of Humble Bundle Purchases
 *
 * Finds the earliest and latest purchase dates and calculates the difference.
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

async function calculateDateRange() {
  console.log('📅 Calculating purchase date range...\n');

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

    // Find earliest and latest dates
    let earliestDate = null;
    let latestDate = null;
    let earliestBundle = null;
    let latestBundle = null;
    let bundlesWithDate = 0;

    for (const page of allBundlePages) {
      const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
      const purchaseDate = page.properties['Purchase Date']?.date?.start;

      if (purchaseDate) {
        bundlesWithDate++;
        const date = new Date(purchaseDate);

        if (!earliestDate || date < earliestDate) {
          earliestDate = date;
          earliestBundle = title;
        }

        if (!latestDate || date > latestDate) {
          latestDate = date;
          latestBundle = title;
        }
      }
    }

    if (earliestDate && latestDate) {
      const daysDifference = Math.floor((latestDate - earliestDate) / (1000 * 60 * 60 * 24));
      const yearsDifference = (daysDifference / 365.25).toFixed(1);

      console.log('📊 Purchase Date Range:\n');
      console.log(`   First purchase: ${earliestDate.toISOString().split('T')[0]}`);
      console.log(`   Bundle: ${earliestBundle}\n`);
      console.log(`   Last purchase:  ${latestDate.toISOString().split('T')[0]}`);
      console.log(`   Bundle: ${latestBundle}\n`);
      console.log(`⏱️  Time span: ${daysDifference} days (${yearsDifference} years)\n`);
      console.log(`📈 Summary:`);
      console.log(`   • Total bundles: ${allBundlePages.length}`);
      console.log(`   • Bundles with date: ${bundlesWithDate}`);
    } else {
      console.log('⚠️  No purchase dates found in the database.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the calculation
calculateDateRange().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
