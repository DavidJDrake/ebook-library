#!/usr/bin/env node

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';
const BOOKS_DB_ID = 'e3f6ee71-0b6a-4558-8168-83be4af679d9';

async function addSampleData() {
  console.log('📦 Adding sample Humble Bundle data...\n');

  try {
    // Step 1: Create sample bundles
    console.log('Creating sample bundles...');

    const bundle1 = await notion.pages.create({
      parent: { database_id: BUNDLES_DB_ID },
      properties: {
        'Name': {
          title: [{ text: { content: 'Programming Essentials Bundle 2024' } }]
        },
        'Bundle Name': {
          rich_text: [{ text: { content: 'Programming Essentials Bundle 2024' } }]
        },
        'Purchase Date': {
          date: { start: '2024-01-15' }
        }
      }
    });
    console.log('✓ Bundle 1 created: Programming Essentials Bundle 2024');

    const bundle2 = await notion.pages.create({
      parent: { database_id: BUNDLES_DB_ID },
      properties: {
        'Name': {
          title: [{ text: { content: 'Web Development Mega Bundle 2024' } }]
        },
        'Bundle Name': {
          rich_text: [{ text: { content: 'Web Development Mega Bundle 2024' } }]
        },
        'Purchase Date': {
          date: { start: '2024-03-22' }
        }
      }
    });
    console.log('✓ Bundle 2 created: Web Development Mega Bundle 2024\n');

    // Step 2: Create sample books
    console.log('Creating sample books...');

    // Book that appears in both bundles
    const book1 = await notion.pages.create({
      parent: { database_id: BOOKS_DB_ID },
      properties: {
        'Name': {
          title: [{ text: { content: 'Clean Code by Robert C. Martin' } }]
        },
        'Publisher': {
          rich_text: [{ text: { content: 'Prentice Hall' } }]
        },
        'Bundles': {
          relation: [
            { id: bundle1.id },
            { id: bundle2.id }
          ]
        }
      }
    });
    console.log('✓ Book 1 added: Clean Code (in BOTH bundles)');

    // Book only in bundle 1
    const book2 = await notion.pages.create({
      parent: { database_id: BOOKS_DB_ID },
      properties: {
        'Name': {
          title: [{ text: { content: 'Design Patterns by Gang of Four' } }]
        },
        'Publisher': {
          rich_text: [{ text: { content: 'Addison-Wesley' } }]
        },
        'Bundles': {
          relation: [{ id: bundle1.id }]
        }
      }
    });
    console.log('✓ Book 2 added: Design Patterns (in Programming bundle only)');

    // Book only in bundle 2
    const book3 = await notion.pages.create({
      parent: { database_id: BOOKS_DB_ID },
      properties: {
        'Name': {
          title: [{ text: { content: 'JavaScript: The Good Parts by Douglas Crockford' } }]
        },
        'Publisher': {
          rich_text: [{ text: { content: "O'Reilly Media" } }]
        },
        'Bundles': {
          relation: [{ id: bundle2.id }]
        }
      }
    });
    console.log('✓ Book 3 added: JavaScript: The Good Parts (in Web Dev bundle only)\n');

    console.log('🎉 Sample data added successfully!\n');
    console.log('📋 What was created:');
    console.log('   • 2 bundles with different purchase dates');
    console.log('   • 3 books with different authors and publishers');
    console.log('   • Clean Code appears in BOTH bundles (demonstrating no duplicates)');
    console.log('\n💡 Next steps:');
    console.log('   • Open the Books database to see all books and their bundles');
    console.log('   • Open a bundle to see which books are in it');
    console.log('   • Add your own bundles and books!');

  } catch (error) {
    console.error('❌ Error adding sample data:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addSampleData();
