#!/usr/bin/env node

/**
 * Humble Bundle eBook Tracker - Database Setup Script
 *
 * Creates two databases:
 * 1. Bundles - Track bundle purchases
 * 2. Books - Track individual books with relation to bundles
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function createHumbleBundleDatabases() {
  try {
    console.log('📚 Creating Humble Bundle eBook tracker databases...\n');

    // Find a parent page
    console.log('📄 Finding parent page...');
    const search = await notion.search({
      filter: {
        value: 'page',
        property: 'object'
      },
      page_size: 1
    });

    if (search.results.length === 0) {
      console.error('❌ No pages found in workspace.');
      process.exit(1);
    }

    const parentPageId = search.results[0].id;
    console.log('✅ Using existing page as parent\n');

    // Step 1: Create Bundles Database
    console.log('📦 Creating Bundles database...');
    const bundlesDatabase = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: parentPageId
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'Humble Bundles'
          }
        }
      ],
      properties: {
        'Bundle Name': {
          title: {}
        },
        'Purchase Date': {
          date: {}
        }
      }
    });
    console.log('✅ Bundles database created!');
    console.log(`   Database ID: ${bundlesDatabase.id}\n`);

    // Step 2: Create Books Database with relation to Bundles
    console.log('📖 Creating Books database...');
    const booksDatabase = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: parentPageId
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'Humble Bundle Books'
          }
        }
      ],
      properties: {
        'Book Title': {
          title: {}
        },
        'Author': {
          rich_text: {}
        },
        'Publisher': {
          rich_text: {}
        },
        'Bundles': {
          relation: {
            database_id: bundlesDatabase.id,
            type: 'dual_property',
            dual_property: {
              synced_property_name: 'Books'
            }
          }
        }
      }
    });
    console.log('✅ Books database created!');
    console.log(`   Database ID: ${booksDatabase.id}\n`);

    // Success summary
    console.log('🎉 All databases created successfully!\n');
    console.log('📋 Summary:');
    console.log(`   Bundles Database: ${bundlesDatabase.url}`);
    console.log(`   Books Database: ${booksDatabase.url}`);
    console.log('\n💡 How to use:');
    console.log('   1. Add bundles with their purchase dates');
    console.log('   2. Add books with author and publisher');
    console.log('   3. Link books to bundles (one book can link to multiple bundles)');
    console.log('   4. View which bundles contain each book and vice versa');
    console.log('\n✨ Save these database IDs for reference:');
    console.log(`   BUNDLES_DB_ID="${bundlesDatabase.id}"`);
    console.log(`   BOOKS_DB_ID="${booksDatabase.id}"`);

  } catch (error) {
    console.error('❌ Error creating databases:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the setup
createHumbleBundleDatabases();
