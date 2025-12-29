#!/usr/bin/env node

/**
 * Calculate Spending Per Year
 *
 * Groups bundles by purchase year and calculates total spent per year.
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

async function calculateSpendingByYear() {
  console.log('💰 Calculating spending per year...\n');

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

    // Track spending by year
    const yearSpending = {};
    let totalSpent = 0;
    let bundlesWithPrice = 0;
    let bundlesWithoutDate = 0;

    console.log('📊 Processing bundles...\n');

    for (const page of allBundlePages) {
      const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
      const price = page.properties.Price?.number;

      // Check for different possible date property names
      const purchaseDate = page.properties['Purchase Date']?.date?.start ||
                          page.properties['Date']?.date?.start ||
                          page.properties['Created']?.created_time;

      if (price !== null && price !== undefined && price > 0) {
        totalSpent += price;
        bundlesWithPrice++;

        if (purchaseDate) {
          const year = new Date(purchaseDate).getFullYear();

          if (!yearSpending[year]) {
            yearSpending[year] = { total: 0, count: 0, bundles: [] };
          }

          yearSpending[year].total += price;
          yearSpending[year].count++;
          yearSpending[year].bundles.push({ title, price });
        } else {
          bundlesWithoutDate++;

          if (!yearSpending['Unknown']) {
            yearSpending['Unknown'] = { total: 0, count: 0, bundles: [] };
          }

          yearSpending['Unknown'].total += price;
          yearSpending['Unknown'].count++;
          yearSpending['Unknown'].bundles.push({ title, price });
        }
      }
    }

    // Display results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💵 SPENDING BY YEAR');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Sort years (earliest first, Unknown last)
    const sortedYears = Object.keys(yearSpending)
      .filter(year => year !== 'Unknown')
      .sort((a, b) => a - b);

    if (yearSpending['Unknown']) {
      sortedYears.push('Unknown');
    }

    for (const year of sortedYears) {
      const data = yearSpending[year];
      const percentage = ((data.total / totalSpent) * 100).toFixed(1);
      const avgPerBundle = (data.total / data.count).toFixed(2);

      console.log(`${year.toString().padEnd(10)} $${data.total.toFixed(2).padStart(10)}  (${data.count} bundles, ${percentage}%, avg: $${avgPerBundle})`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`TOTAL SPENT:   $${totalSpent.toFixed(2).padStart(10)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Summary:');
    console.log(`   • Total bundles with price: ${bundlesWithPrice}`);
    console.log(`   • Bundles without date: ${bundlesWithoutDate}`);
    console.log(`   • Years covered: ${sortedYears.filter(y => y !== 'Unknown').length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the calculation
calculateSpendingByYear().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
