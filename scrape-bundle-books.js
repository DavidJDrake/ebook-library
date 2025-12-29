#!/usr/bin/env node

/**
 * Scrape Individual Books from Humble Bundle Library
 *
 * This script logs into Humble Bundle, navigates to your library,
 * and extracts individual book details from each bundle.
 */

const puppeteer = require('puppeteer');
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';
const BOOKS_DB_ID = 'e3f6ee71-0b6a-4558-8168-83be4af679d9';

async function scrapeIndividualBooks() {
  console.log('📚 Starting Humble Bundle book extraction...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Login process
    console.log('🔐 Logging in to Humble Bundle...');
    await page.goto('https://www.humblebundle.com/login', { waitUntil: 'networkidle2' });

    // Handle consent dialog
    console.log('🍪 Checking for privacy consent dialog...');
    try {
      await page.waitForSelector('button::-p-text(I Consent)', { timeout: 5000 });
      await page.click('button::-p-text(I Consent)');
      console.log('   ✓ Consent dialog dismissed\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.log('   ✓ No consent dialog found\n');
    }

    // Enter credentials
    await page.type('input[name="username"]', process.env.HUMBLE_EMAIL, { delay: 50 });
    await page.type('input[name="password"]', process.env.HUMBLE_PASSWORD, { delay: 50 });
    await page.click('button[type="submit"]');

    // Wait for potential email verification
    console.log('📧 Waiting for login...');
    console.log('   If prompted, enter your email verification code and press Enter');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 });
    console.log('   ✓ Login successful!\n');

    // Navigate to library
    console.log('📖 Navigating to your library...');
    await page.goto('https://www.humblebundle.com/home/library', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get all bundles from Notion
    console.log('📊 Fetching bundles from Notion...');
    let allBundles = [];
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

      const bundles = response.results.filter(page =>
        page.parent && page.parent.database_id === BUNDLES_DB_ID
      );

      allBundles = allBundles.concat(bundles);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    console.log(`   Found ${allBundles.length} bundles in Notion\n`);

    // Extract books from library
    console.log('📚 Extracting book details from library...\n');

    // Get all book tiles on the page
    const books = await page.evaluate(() => {
      const bookElements = document.querySelectorAll('.subproduct-selector');
      const extractedBooks = [];

      bookElements.forEach(element => {
        try {
          const titleElement = element.querySelector('.item-title');
          const authorElement = element.querySelector('.item-author');

          if (titleElement) {
            const title = titleElement.textContent.trim();
            const author = authorElement ? authorElement.textContent.trim().replace('by ', '') : '';

            // Try to get bundle name from parent or context
            const bundleElement = element.closest('[data-bundle-title]');
            const bundleName = bundleElement ? bundleElement.getAttribute('data-bundle-title') : '';

            extractedBooks.push({
              title,
              author,
              bundleName
            });
          }
        } catch (err) {
          // Skip this book if extraction fails
        }
      });

      return extractedBooks;
    });

    console.log(`   Found ${books.length} books in your library\n`);

    if (books.length === 0) {
      console.log('⚠️  No books found. The page structure may have changed.');
      console.log('   Please check the library page manually.\n');

      // Take a screenshot for debugging
      await page.screenshot({ path: 'library-debug.png', fullPage: true });
      console.log('   📸 Screenshot saved to library-debug.png');

      console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } else {
      // Group books by bundle and add to Notion
      console.log('💾 Adding books to Notion...\n');

      let addedCount = 0;
      const booksByBundle = {};

      for (const book of books) {
        const key = book.bundleName || 'Unknown Bundle';
        if (!booksByBundle[key]) {
          booksByBundle[key] = [];
        }
        booksByBundle[key].push(book);
      }

      for (const [bundleName, bundleBooks] of Object.entries(booksByBundle)) {
        console.log(`📦 Processing: ${bundleName}`);
        console.log(`   Books: ${bundleBooks.length}`);

        // Find matching bundle in Notion
        const matchingBundle = allBundles.find(b => {
          const notionBundleName = b.properties['Bundle Name']?.rich_text?.[0]?.plain_text || '';
          return notionBundleName.includes(bundleName) || bundleName.includes(notionBundleName);
        });

        for (const book of bundleBooks) {
          try {
            const bookName = book.author ? `${book.title} by ${book.author}` : book.title;

            await notion.pages.create({
              parent: { database_id: BOOKS_DB_ID },
              properties: {
                'Name': {
                  title: [{ type: 'text', text: { content: bookName } }]
                },
                'Title': {
                  rich_text: [{ type: 'text', text: { content: book.title } }]
                },
                'Author': {
                  rich_text: [{ type: 'text', text: { content: book.author } }]
                },
                ...(matchingBundle && {
                  'Bundles': {
                    relation: [{ id: matchingBundle.id }]
                  }
                })
              }
            });

            addedCount++;
          } catch (error) {
            console.log(`   ✗ Failed to add: ${book.title} - ${error.message}`);
          }
        }
      }

      console.log(`\n✅ Added ${addedCount} books to Notion!\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('   Screenshot saved to error-screenshot.png');
  } finally {
    await browser.close();
  }
}

// Check for required environment variables
if (!process.env.HUMBLE_EMAIL || !process.env.HUMBLE_PASSWORD) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Make sure .env.humble contains HUMBLE_EMAIL and HUMBLE_PASSWORD');
  process.exit(1);
}

if (!process.env.NOTION_TOKEN) {
  console.error('❌ Error: NOTION_TOKEN environment variable is required');
  process.exit(1);
}

scrapeIndividualBooks();
