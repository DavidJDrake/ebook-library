#!/usr/bin/env node

/**
 * Calculate Spending Per Category
 *
 * Groups bundles by category and calculates total spent per category.
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

async function calculateSpendingByCategory() {
  console.log('💰 Calculating spending per category...\n');

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

    // Track spending by category
    const categorySpending = {
      'Video Games': { total: 0, count: 0 },
      'Books': { total: 0, count: 0 },
      'Comics/Manga': { total: 0, count: 0 },
      'RPG/Tabletop': { total: 0, count: 0 },
      'Software': { total: 0, count: 0 },
      'Music': { total: 0, count: 0 },
      'Uncategorized': { total: 0, count: 0 }
    };

    let totalSpent = 0;
    let bundlesWithPrice = 0;

    console.log('📊 Processing bundles...\n');

    for (const page of allBundlePages) {
      const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
      const price = page.properties.Price?.number;
      const bundleTypes = page.properties['Bundle Type']?.multi_select || [];

      if (price !== null && price !== undefined && price > 0) {
        totalSpent += price;
        bundlesWithPrice++;

        // If bundle has categories, add price to each category
        if (bundleTypes.length > 0) {
          bundleTypes.forEach(type => {
            const categoryName = type.name;
            if (categorySpending[categoryName]) {
              categorySpending[categoryName].total += price;
              categorySpending[categoryName].count++;
            }
          });
        } else {
          // No category assigned
          categorySpending['Uncategorized'].total += price;
          categorySpending['Uncategorized'].count++;
        }
      }
    }

    // Display results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💵 SPENDING BY CATEGORY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Sort categories by spending (highest first)
    const sortedCategories = Object.entries(categorySpending)
      .filter(([_, data]) => data.count > 0)
      .sort((a, b) => b[1].total - a[1].total);

    for (const [category, data] of sortedCategories) {
      const percentage = ((data.total / totalSpent) * 100).toFixed(1);
      console.log(`${category.padEnd(20)} $${data.total.toFixed(2).padStart(10)}  (${data.count} bundles, ${percentage}%)`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`TOTAL SPENT:         $${totalSpent.toFixed(2).padStart(10)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Summary:');
    console.log(`   • Total bundles with price: ${bundlesWithPrice}`);
    console.log(`   • Total categories assigned: ${sortedCategories.length}`);
    console.log(`\n⚠️  Note: Bundles can have multiple categories, so category totals may exceed total spent.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the calculation
calculateSpendingByCategory().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
