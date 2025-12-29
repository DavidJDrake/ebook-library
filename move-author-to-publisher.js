#!/usr/bin/env node

/**
 * Move Author to Publisher in Books Database
 *
 * Moves all data from the Author property to Publisher property,
 * leaving Author empty for future proper author extraction.
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BOOKS_DB_ID = 'e3f6ee71-0b6a-4558-8168-83be4af679d9';

async function moveAuthorToPublisher() {
  console.log('📚 Moving Author data to Publisher in Books database...\n');

  // Fetch all books
  console.log('📖 Fetching all books from Notion...');
  let allBooks = [];
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

    const books = response.results.filter(p =>
      p.parent && p.parent.database_id === BOOKS_DB_ID
    );

    allBooks = allBooks.concat(books);
    hasMore = response.has_more;
    startCursor = response.next_cursor;

    if (hasMore) {
      console.log(`   Fetched ${allBooks.length} books so far...`);
    }
  }

  console.log(`   ✓ Found ${allBooks.length} books total\n`);

  // Update each book
  console.log('🔄 Moving Author → Publisher...\n');
  let updatedCount = 0;
  let skippedCount = 0;

  for (const book of allBooks) {
    try {
      const authorValue = book.properties.Author?.rich_text?.[0]?.plain_text || '';

      // Only update if there's author data to move
      if (authorValue) {
        await notion.pages.update({
          page_id: book.id,
          properties: {
            'Publisher': {
              rich_text: [{ type: 'text', text: { content: authorValue } }]
            },
            'Author': {
              rich_text: []
            }
          }
        });

        updatedCount++;
        if (updatedCount % 50 === 0) {
          console.log(`   Updated ${updatedCount} books...`);
        }
      } else {
        skippedCount++;
      }

    } catch (error) {
      console.error(`   ✗ Failed to update book ${book.id}: ${error.message}`);
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   • Total books: ${allBooks.length}`);
  console.log(`   • Updated: ${updatedCount}`);
  console.log(`   • Skipped (no author data): ${skippedCount}\n`);
}

if (!process.env.NOTION_TOKEN) {
  console.error('❌ Missing NOTION_TOKEN');
  process.exit(1);
}

moveAuthorToPublisher();
