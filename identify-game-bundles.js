#!/usr/bin/env node

/**
 * Identify Game Bundles vs Book Bundles
 *
 * Categorizes bundles based on their names to identify video game bundles.
 */

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

async function identifyGameBundles() {
  console.log('🎮 Identifying game bundles...\n');

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

    // Categorize bundles
    const games = [];
    const books = [];
    const comics = [];
    const rpgTabletop = [];
    const software = [];
    const music = [];
    const other = [];

    for (const page of allBundlePages) {
      const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
      const name = title.toLowerCase();

      // Books - explicit "Book Bundle" or "Tech Book Bundle"
      if (name.includes('book bundle:') || name.includes('tech book bundle:')) {
        books.push(title);
      }
      // Comics/Manga
      else if (name.includes('comic') || name.includes('manga')) {
        comics.push(title);
      }
      // RPG/Tabletop (usually PDFs/rulebooks, not video games)
      else if (name.includes('rpg bundle:') || name.includes('vtt bundle:') ||
               name.includes('tabletop') || name.includes('3d printable')) {
        rpgTabletop.push(title);
      }
      // Software/Development bundles
      else if (name.includes('software bundle:') || name.includes('learn to code') ||
               name.includes('data science') || name.includes('level up your python')) {
        software.push(title);
      }
      // Music
      else if (name.includes('music bundle')) {
        music.push(title);
      }
      // Video Games - everything else is likely a game bundle
      // This includes: Indie Bundle, specific game publishers (Capcom, THQ, etc.),
      // mobile bundles, individual game titles (Valheim, LEGO, etc.)
      else {
        games.push(title);
      }
    }

    // Display results
    console.log(`🎮 VIDEO GAME BUNDLES (${games.length}):\n`);
    games.sort().forEach(game => console.log(`   • ${game}`));

    console.log(`\n📚 BOOK BUNDLES (${books.length}):\n`);
    books.sort().forEach(book => console.log(`   • ${book}`));

    console.log(`\n📖 COMIC/MANGA BUNDLES (${comics.length}):\n`);
    comics.sort().forEach(comic => console.log(`   • ${comic}`));

    console.log(`\n🎲 RPG/TABLETOP BUNDLES (${rpgTabletop.length}):\n`);
    rpgTabletop.sort().forEach(rpg => console.log(`   • ${rpg}`));

    console.log(`\n💻 SOFTWARE BUNDLES (${software.length}):\n`);
    software.sort().forEach(sw => console.log(`   • ${sw}`));

    console.log(`\n🎵 MUSIC BUNDLES (${music.length}):\n`);
    music.sort().forEach(mus => console.log(`   • ${mus}`));

    console.log(`\n📊 SUMMARY:`);
    console.log(`   • Video Games: ${games.length}`);
    console.log(`   • Books: ${books.length}`);
    console.log(`   • Comics/Manga: ${comics.length}`);
    console.log(`   • RPG/Tabletop: ${rpgTabletop.length}`);
    console.log(`   • Software: ${software.length}`);
    console.log(`   • Music: ${music.length}`);
    console.log(`   • Total: ${allBundlePages.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the identification
identifyGameBundles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
