# eBook Library Manager

Automated eBook library management system that tracks your Humble Bundle purchases and organizes them in Notion.

## Overview

This project provides:
- **Automated Humble Bundle scraping** - Extract your purchase history automatically with pagination support
- **Individual book extraction** - Extract all individual books from your library with title, author, and bundle relationships
- **Notion integration** - Store and organize your bundle collection and individual books with categorization
- **Smart categorization** - Automatically categorizes bundles (Books, Video Games, Comics/Manga, RPG/Tabletable, Software, Music)
- **Multi-select tagging** - Bundles can have multiple categories (e.g., Comics are also tagged as Books)
- **Purchase tracking** - Keep track of bundle purchases with dates and prices
- **Analytics** - Calculate total spending, date ranges, and identify duplicate purchases
- **Backup utilities** - Export your data to JSON/CSV formats

## Features

🤖 **Automated Scraping**
- Puppeteer-based web scraping of Humble Bundle purchase history
- Automatic login with email verification support
- Privacy consent dialog handling
- Pagination with duplicate detection
- Progress reporting and error handling

📊 **Bundle Management**
- Track bundle name, purchase date, price, and type
- Automatic categorization based on bundle name patterns
- Multi-select categories (e.g., RPG/Tabletop bundles are also tagged as Books)
- 143 bundles tracked across 15+ years of purchases

📚 **Individual Book Extraction**
- Extract all individual books from your Humble Bundle library
- Automatically link books to their parent bundles
- Track title, author, and publisher information
- Duplicate detection and deduplication
- 1,896 books extracted and cataloged

📈 **Analytics Scripts**
- `calculate-total-spent.js` - Calculate total money spent on bundles
- `calculate-date-range.js` - Calculate time span between first and last purchase
- `find-duplicate-purchases.js` - Identify bundles purchased more than once
- `identify-game-bundles.js` - Categorize bundles by content type

💾 **Backup & Recovery**
- `backup-bundles-database.js` - Export specific database to JSON/CSV
- `.claude/skills/backup-notion-db.js` - Reusable skill to backup any Notion database
- Timestamped backups for version tracking

🔒 **Secure**
- Credentials stored in local `.env.humble` file
- Never committed to git
- Environment variable based configuration

## Quick Start

### Prerequisites

- Node.js installed
- Notion account with API access
- Humble Bundle account

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/DavidJDrake/ebook-library.git
   cd ebook-library
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your Notion token:
   ```bash
   export NOTION_TOKEN="your_notion_integration_token"
   ```

4. Set up your Notion workspace:
   - Create a new page at the root level called "eBook Library"
   - Create the "Humble Bundles" database under this page (see database structure below)
   - Create the "Humble Bundle Books" database under this page (see database structure below)
   - Share the "eBook Library" page with your Notion integration

   **Important**: Both databases must be created before running the extraction scripts. The Books database requires a "Bundles" relation property that links back to the Humble Bundles database.

### Usage

#### Scraping Humble Bundle Purchases

Run the scraper to fetch all your bundle purchases:

```bash
export $(cat .env.humble | grep -v '^#' | xargs)
node scrape-humble-bundle.js
```

The scraper will:
- Handle privacy consent dialogs automatically
- Prompt for email verification code if needed
- Paginate through all purchase pages
- Extract bundle name, date, and price
- Add entries to your Notion database

#### Importing from File

If you have a `bundles.txt` file with bundle data:

```bash
NOTION_TOKEN="your_token" node import-bundles-from-file.js
```

Format: `Bundle Name    Date    Price` (one per line)

#### Analytics

Calculate total spending:
```bash
NOTION_TOKEN="your_token" node calculate-total-spent.js
```

Find duplicate purchases:
```bash
NOTION_TOKEN="your_token" node find-duplicate-purchases.js
```

Calculate purchase date range:
```bash
NOTION_TOKEN="your_token" node calculate-date-range.js
```

#### Backup Your Data

Create timestamped JSON and CSV backups:

```bash
NOTION_TOKEN="your_token" node backup-bundles-database.js
```

Or use the reusable skill for any database:

```bash
NOTION_TOKEN="your_token" node .claude/skills/backup-notion-db.js <database_id>
```

#### Update Categories

Automatically categorize all bundles based on their names:

```bash
NOTION_TOKEN="your_token" node update-bundle-categories.js
```

#### Extract Individual Books

Extract all individual books from your Humble Bundle library:

```bash
export $(cat .env.humble | grep -v '^#' | xargs)
node extract-books-from-library.js
```

The script will:
- Log into Humble Bundle (prompts for email verification code)
- Navigate to your library and scroll to load all content
- Extract book titles, publishers, and bundle information
- Match books to their parent bundles in Notion
- Create entries in the "Humble Bundle Books" database
- Link books to their bundles via the Bundles relation property

**Note**: This script extracts 1,896+ books and may take 15-20 minutes to complete. The extracted data populates the Publisher field (what appears as "author" in the library is typically the publisher).

## Project Structure

```
ebook-library/
├── scrape-humble-bundle.js              # Main scraper with pagination
├── extract-books-from-library.js        # Extract individual books from library
├── explore-library-structure.js         # Analyze library page structure
├── move-author-to-publisher.js          # Migrate Author field data to Publisher
├── import-bundles-from-file.js          # Import from bundles.txt
├── backup-bundles-database.js           # Backup to JSON/CSV
├── calculate-total-spent.js             # Analytics: total spending
├── calculate-date-range.js              # Analytics: date range
├── calculate-spending-by-category.js    # Analytics: spending by bundle type
├── calculate-spending-by-year.js        # Analytics: spending by year
├── find-duplicate-purchases.js          # Analytics: duplicate detection
├── identify-game-bundles.js             # Categorize bundle types
├── update-bundle-categories.js          # Update all bundle categories
├── delete-humble-test-data.js           # Clean up test data
├── .claude/
│   └── skills/
│       ├── backup-notion-db.js          # Reusable backup skill
│       └── backup-notion-db.json        # Skill metadata
├── backups/                             # Timestamped backup files
├── bundles.txt                          # Source data file (143 bundles)
├── .env.humble                          # Your credentials (NOT in git)
├── .gitignore                           # Git ignore rules
├── package.json                         # Node.js dependencies
└── README.md                            # This file
```

## Notion Workspace Organization

Your Notion workspace should be organized as follows:

```
Notion Workspace (root level)
└── 📁 eBook Library
    ├── 📊 Humble Bundles (database)
    └── 📚 Humble Bundle Books (database - optional)
```

**Important**:
- The "eBook Library" page should be at the workspace root level, not nested under other pages
- Both databases must be under the "eBook Library" page
- Share the "eBook Library" page with your Notion integration to grant access to all databases

## Notion Database Structure

### Humble Bundles Database

Properties:
- **Name** (Title) - Bundle title
- **Bundle Name** (Rich Text) - Full bundle name
- **Purchase Date** (Date) - When you purchased the bundle
- **Price** (Number) - Amount paid in dollars
- **Bundle Type** (Multi-select) - Categories: Books, Video Games, Comics/Manga, RPG/Tabletop, Software, Music

Example entry:
- Name: "Humble Tech Book Bundle: Software Architecture by Pearson"
- Bundle Name: "Humble Tech Book Bundle: Software Architecture by Pearson"
- Purchase Date: 2025-12-09
- Price: 25
- Bundle Type: [Books]

### Humble Bundle Books Database

Properties:
- **Name** (Title) - Book title and publisher (combined)
- **Title** (Rich Text) - Book title
- **Author** (Rich Text) - Author name (currently empty, reserved for future population)
- **Publisher** (Rich Text) - Publisher name
- **Bundles** (Relation) - Links to one or more bundles containing this book

Example entry:
- Name: "The Pragmatic Programmer by Addison-Wesley"
- Title: "The Pragmatic Programmer"
- Author: (empty - to be populated)
- Publisher: "Addison-Wesley"
- Bundles: [Link to "Humble Tech Book Bundle: Software Architecture"]

**Stats**: 1,896 individual books extracted from 143 bundles, with automatic linking to their parent bundles.

**Note**: The Publisher field contains what was extracted from the library (often the actual publisher). The Author field is currently empty and available for future population with actual author names.

## How It Works

### Scraping Process (Bundles)

1. **Login** - Navigates to Humble Bundle and logs in with your credentials
2. **Email Verification** - Waits for you to enter the verification code
3. **Consent Handling** - Automatically dismisses privacy consent dialogs
4. **Data Extraction** - Scrapes bundle name, date, and price from purchase history
5. **Pagination** - Clicks through all pages until duplicate bundles are detected
6. **Notion Sync** - Creates database entries for each bundle

### Book Extraction Process

1. **Login** - Logs into Humble Bundle with email verification
2. **Library Navigation** - Navigates to the library page and waits for content to load
3. **Dynamic Content Loading** - Scrolls the page to trigger loading of all books
4. **Element Detection** - Tries multiple selectors to find book containers (`.subproduct-selector`, etc.)
5. **Data Extraction** - Extracts title and publisher from each book element
6. **Bundle Matching** - Matches books to their parent bundles using bundle name attributes
7. **Deduplication** - Removes duplicate books using title+publisher as unique key
8. **Notion Sync** - Creates entries in Books database with bundle relations
9. **Progress Reporting** - Shows progress every 50 books

**Key Features**:
- Multiple selector fallback strategies for reliability
- Automatic scrolling to load all content
- Text filtering to avoid navigation elements
- Bundle relationship linking
- Zero duplicates in final dataset
- Publisher field populated with extracted data (Author field left empty for future use)

### Categorization Logic

The system categorizes bundles based on name patterns:

- **Books**: Contains "Book Bundle" or "Tech Book Bundle"
- **Video Games**: Default category if no other match
- **Comics/Manga**: Contains "comic" or "manga" (also tagged as Books)
- **RPG/Tabletop**: Contains "RPG Bundle", "VTT Bundle", "tabletop", or "3d printable" (also tagged as Books)
- **Software**: Contains "Software Bundle", "Learn to Code", "Data Science"
- **Music**: Contains "Music Bundle"

### Backup System

The backup skill creates two files:
- **JSON**: Full data with IDs, timestamps, and all properties
- **CSV**: Human-readable format for spreadsheet apps

Both files are timestamped: `humble-bundles-backup-2025-12-29T02-21-47.{json,csv}`

## Real-World Results

### Bundle Statistics

From 143 bundles across 15 years:
- **Total spent**: $2,350.64
- **Date range**: Dec 17, 2010 to Dec 9, 2025 (5,471 days / 15.0 years)
- **Duplicates**: 8 bundles purchased more than once (9 total duplicates, $183 wasted)
- **Breakdown**:
  - 82 Books
  - 37 Video Games
  - 13 RPG/Tabletop (also tagged as Books)
  - 6 Comics/Manga (also tagged as Books)
  - 4 Software
  - 1 Music

### Individual Book Extraction

From library extraction:
- **Total books extracted**: 1,896 individual books
- **Unique books**: 1,896 (zero duplicates)
- **Success rate**: 100% (all books successfully added to Notion)
- **Bundle links**: Automatically linked books to their parent bundles
- **Extraction time**: ~15-20 minutes for complete library

**Average**: ~13 books per bundle across the entire collection

## Troubleshooting

### Scraper Issues

**Login fails**:
- Check credentials in `.env.humble`
- Ensure you enter the email verification code when prompted

**Privacy consent blocks form input**:
- Already handled! The scraper dismisses consent dialogs automatically

**Pagination stuck or repeating bundles**:
- The scraper uses duplicate detection to stop when it sees the same bundles twice

**Price validation errors**:
- Ensure Price property in Notion is type "Number", not "Rich Text"

### Book Extraction Issues

**No books found (0 books extracted)**:
- Run `explore-library-structure.js` to debug page structure
- Check screenshot (`library-page.png`) and analysis (`library-analysis.json`)
- Library page structure may have changed - selectors may need updating

**Books not linked to bundles**:
- Ensure Humble Bundles database is populated first
- Bundle names must match between library page and Notion database
- Check that both databases are under the "eBook Library" page

**Extraction very slow**:
- Normal for large libraries (1,896 books takes 15-20 minutes)
- Notion API rate limiting may cause delays
- Progress is shown every 50 books

### Backup Issues

**Database not found**:
- Verify database ID is correct
- Ensure database is shared with your Notion integration

**Empty backups**:
- Check that the database has entries
- Verify NOTION_TOKEN environment variable is set

## Security Notes

⚠️ **Important**:
- Never commit `.env.humble` to git
- Never share your Notion token publicly
- Keep your Humble Bundle password secure
- Backup files may contain personal purchase history

✅ **This project**:
- Stores credentials locally only
- Uses environment variables
- Includes `.env.humble` in `.gitignore`
- Includes `backups/` in `.gitignore`

## Claude Code Skills

This project includes a reusable Claude Code skill:

### /backup-notion-db

Creates file-based backups of any Notion database.

**Usage**: `/backup-notion-db <database_id>`

**Features**:
- Exports to JSON and CSV formats
- Timestamped filenames
- Handles all property types
- Saves to `./backups/` directory

**Note**: For Notion-to-Notion backups, use Notion's built-in duplicate feature (⋯ menu > Duplicate) as the API has limitations with programmatically creating databases with properties.

## Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## License

MIT License - feel free to use and modify for your own eBook tracking needs.

## Acknowledgments

Built with:
- [Puppeteer](https://pptr.dev/) - Browser automation
- [Notion API](https://developers.notion.com/) - Database backend
- [@notionhq/client](https://www.npmjs.com/package/@notionhq/client) - Notion JavaScript SDK

---

**Happy tracking!** 📚💰
