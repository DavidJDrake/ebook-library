#!/usr/bin/env node

/**
 * Update Bundle Type to Match Actual Categories
 *
 * Categorizes bundles and updates the Bundle Type property in Notion.
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

function categorizeBundle(title) {
  const name = title.toLowerCase();
  const categories = [];

  // Books - explicit "Book Bundle" or "Tech Book Bundle"
  if (name.includes('book bundle:') || name.includes('tech book bundle:')) {
    categories.push('Books');
  }
  // Comics/Manga (also gets Books tag)
  if (name.includes('comic') || name.includes('manga')) {
    categories.push('Comics/Manga');
    categories.push('Books');
  }
  // RPG/Tabletop (also gets Books tag)
  if (name.includes('rpg bundle:') || name.includes('vtt bundle:') ||
      name.includes('tabletop') || name.includes('3d printable')) {
    categories.push('RPG/Tabletop');
    categories.push('Books');
  }
  // Software/Development bundles
  if (name.includes('software bundle:') || name.includes('learn to code') ||
      name.includes('data science') || name.includes('level up your python')) {
    categories.push('Software');
  }
  // Music
  if (name.includes('music bundle')) {
    categories.push('Music');
  }

  // Video Games - if no categories assigned yet, it's a video game
  if (categories.length === 0) {
    categories.push('Video Games');
  }

  return categories;
}

async function updateBundleCategories() {
  console.log('🏷️  Updating Bundle Type to match actual categories...\n');

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

    // Track statistics
    const stats = {
      'Video Games': 0,
      'Books': 0,
      'Comics/Manga': 0,
      'RPG/Tabletop': 0,
      'Software': 0,
      'Music': 0
    };

    let totalUpdated = 0;
    let failed = 0;

    // Update each page
    for (const page of allBundlePages) {
      try {
        const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
        const categories = categorizeBundle(title);

        // Update the Bundle Type property with multi-select
        await notion.pages.update({
          page_id: page.id,
          properties: {
            'Bundle Type': {
              multi_select: categories.map(cat => ({ name: cat }))
            }
          }
        });

        // Update stats for all categories
        categories.forEach(cat => {
          stats[cat]++;
        });

        totalUpdated++;
        const categoryDisplay = categories.join(', ');
        console.log(`  ✓ ${categoryDisplay.padEnd(30)} - ${title}`);
      } catch (error) {
        const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
        console.error(`  ✗ Failed to update "${title}": ${error.message}`);
        failed++;
      }
    }

    console.log(`\n🎉 Update complete!`);
    console.log(`   • Successfully updated: ${totalUpdated}`);
    console.log(`   • Failed: ${failed}`);
    console.log(`\n📊 Category Breakdown:`);
    console.log(`   (Note: Bundles can have multiple categories, so totals may exceed bundle count)`);
    console.log(`   • Video Games: ${stats['Video Games']}`);
    console.log(`   • Books: ${stats['Books']}`);
    console.log(`   • Comics/Manga: ${stats['Comics/Manga']}`);
    console.log(`   • RPG/Tabletop: ${stats['RPG/Tabletop']}`);
    console.log(`   • Software: ${stats['Software']}`);
    console.log(`   • Music: ${stats['Music']}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the update
updateBundleCategories().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
