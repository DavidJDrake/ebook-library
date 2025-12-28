# eBook Library Manager

Automated eBook library management system that tracks your Humble Bundle purchases and organizes them in Notion.

## Overview

This project provides:
- **Automated Humble Bundle scraping** - Extract your purchase history automatically
- **Notion integration** - Store and organize your eBook collection
- **Duplicate detection** - Books appearing in multiple bundles are tracked without duplication
- **Purchase tracking** - Keep track of which bundles you purchased and when

## Features

🤖 **Automated Scraping**
- Puppeteer-based web scraping of Humble Bundle purchase history
- Automatic login and data extraction
- Progress reporting and error handling

📚 **Smart Organization**
- Two-database structure: Bundles and Books
- Many-to-many relationships (one book can be in multiple bundles)
- Track bundle purchase dates
- Track book metadata (author, publisher)

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

3. Set up Notion databases (first time only):
   ```bash
   NOTION_TOKEN="your_token" node create-humble-bundle-databases.js
   ```

4. Share the created databases with your Notion integration

5. Add your credentials to `.env.humble`:
   ```bash
   cp .env.humble.example .env.humble
   nano .env.humble
   ```

### Usage

Run the Humble Bundle scraper:

```bash
./run-humble-scraper.sh
```

Or manually:

```bash
export $(cat .env.humble | grep -v '^#' | xargs)
node scrape-humble-bundle.js
```

## Project Structure

```
ebook-library/
├── scrape-humble-bundle.js       # Main scraper script
├── create-humble-bundle-databases.js  # Database setup
├── add-humble-sample-data.js     # Sample data for testing
├── delete-humble-test-data.js    # Clean up test data
├── run-humble-scraper.sh         # Helper script to run scraper
├── .env.humble                   # Your credentials (NOT in git)
├── HUMBLE-BUNDLE-SCRAPER.md     # Detailed scraper documentation
├── README.md                     # This file
└── package.json                  # Node.js dependencies
```

## Notion Database Structure

### Bundles Database
- **Bundle Name** (Text) - Name of the Humble Bundle
- **Purchase Date** (Date) - When you purchased it

### Books Database
- **Name** (Title) - Book title and author
- **Publisher** (Text) - Publisher name
- **Bundles** (Relation) - Links to one or more bundles containing this book

## How It Works

1. **Scraper logs into Humble Bundle** using your credentials
2. **Navigates to purchase history** page
3. **Extracts bundle data** (names and purchase dates)
4. **Creates Notion pages** for each bundle
5. *(Future)* Extract book details from each bundle

## Troubleshooting

See [HUMBLE-BUNDLE-SCRAPER.md](HUMBLE-BUNDLE-SCRAPER.md) for detailed troubleshooting.

Common issues:
- **Login fails**: Check credentials in `.env.humble`
- **No purchases found**: Humble Bundle may have changed their page structure
- **Timeout errors**: Increase timeout values in script

## Security Notes

⚠️ **Important**:
- Never commit `.env.humble` to git
- Never share your Notion token publicly
- Keep your Humble Bundle password secure

✅ **This project**:
- Stores credentials locally only
- Uses environment variables
- Includes `.env.humble` in `.gitignore`

## Roadmap

- [ ] Extract individual book details from bundles
- [ ] Add book covers/thumbnails
- [ ] Track reading status
- [ ] Export library as CSV/JSON
- [ ] Support other eBook platforms (DriveThruRPG, etc.)
- [ ] Web interface for browsing library

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

**Happy reading!** 📚
