#!/usr/bin/env node

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';
const BOOKS_DB_ID = 'e3f6ee71-0b6a-4558-8168-83be4af679d9';

async function deleteAllTestData() {
  console.log('🗑️  Deleting all test data from Humble Bundle databases...\n');

  try {
    // Get all pages from both databases
    console.log('📄 Finding all pages...');
    const response = await notion.search({
      filter: {
        value: 'page',
        property: 'object'
      },
      page_size: 100
    });

    // Filter to only pages from our databases
    const bundlePages = response.results.filter(page =>
      page.parent && page.parent.database_id === BUNDLES_DB_ID
    );

    const bookPages = response.results.filter(page =>
      page.parent && page.parent.database_id === BOOKS_DB_ID
    );

    console.log(`   Found ${bundlePages.length} bundles`);
    console.log(`   Found ${bookPages.length} books\n`);

    // Delete all bundles
    if (bundlePages.length > 0) {
      console.log('🗑️  Deleting bundles...');
      for (const page of bundlePages) {
        const name = page.properties.Name?.title[0]?.plain_text || 'Untitled';
        await notion.pages.update({
          page_id: page.id,
          archived: true
        });
        console.log(`   ✓ Deleted: ${name}`);
      }
      console.log();
    }

    // Delete all books
    if (bookPages.length > 0) {
      console.log('🗑️  Deleting books...');
      for (const page of bookPages) {
        const name = page.properties.Name?.title[0]?.plain_text || 'Untitled';
        await notion.pages.update({
          page_id: page.id,
          archived: true
        });
        console.log(`   ✓ Deleted: ${name}`);
      }
      console.log();
    }

    console.log('✅ All test data deleted successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Deleted ${bundlePages.length} bundles`);
    console.log(`   • Deleted ${bookPages.length} books`);
    console.log('\n💡 Your databases are now empty and ready for real data!');

  } catch (error) {
    console.error('❌ Error deleting test data:', error.message);
    process.exit(1);
  }
}

deleteAllTestData();
