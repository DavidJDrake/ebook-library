#!/usr/bin/env node

/**
 * Find Duplicate Bundle Purchases
 *
 * Identifies bundles that were purchased more than once.
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

async function findDuplicatePurchases() {
  console.log('🔍 Finding duplicate bundle purchases...\n');

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

    console.log(`   Found ${allBundlePages.length} total bundle purchases\n`);

    // Group bundles by name
    const bundleGroups = {};

    for (const page of allBundlePages) {
      const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
      const purchaseDate = page.properties['Purchase Date']?.date?.start;
      const price = page.properties.Price?.number || 0;

      if (!bundleGroups[title]) {
        bundleGroups[title] = [];
      }

      bundleGroups[title].push({
        date: purchaseDate,
        price: price
      });
    }

    // Find duplicates
    const duplicates = [];
    let totalDuplicatePurchases = 0;

    for (const [bundleName, purchases] of Object.entries(bundleGroups)) {
      if (purchases.length > 1) {
        duplicates.push({
          name: bundleName,
          count: purchases.length,
          purchases: purchases
        });
        // Total duplicates = count - 1 (the first purchase is not a duplicate)
        totalDuplicatePurchases += (purchases.length - 1);
      }
    }

    // Sort by count (most duplicates first)
    duplicates.sort((a, b) => b.count - a.count);

    // Display results
    if (duplicates.length > 0) {
      console.log(`🔄 DUPLICATE PURCHASES (${duplicates.length} bundles purchased more than once):\n`);

      for (const dup of duplicates) {
        console.log(`📦 ${dup.name}`);
        console.log(`   Purchased ${dup.count} times:`);
        dup.purchases.sort((a, b) => new Date(a.date) - new Date(b.date));
        dup.purchases.forEach((p, idx) => {
          console.log(`     ${idx + 1}. ${p.date} - $${p.price.toFixed(2)}`);
        });
        console.log();
      }

      console.log(`📊 SUMMARY:`);
      console.log(`   • Total bundle entries in database: ${allBundlePages.length}`);
      console.log(`   • Unique bundles: ${Object.keys(bundleGroups).length}`);
      console.log(`   • Bundles purchased more than once: ${duplicates.length}`);
      console.log(`   • Total duplicate/over-purchases: ${totalDuplicatePurchases}`);
      console.log(`   • Money wasted on duplicates: $${duplicates.reduce((sum, d) => {
        // Calculate wasted money (all purchases after the first)
        return sum + d.purchases.slice(1).reduce((s, p) => s + p.price, 0);
      }, 0).toFixed(2)}`);
    } else {
      console.log('✅ No duplicate purchases found! Every bundle was purchased only once.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the check
findDuplicatePurchases().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
