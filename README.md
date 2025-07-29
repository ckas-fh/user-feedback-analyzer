# User Feedback Analyzer

An AI-powered web application that analyzes user feedback to extract sentiment, themes, and actionable insights using Claude AI.

## Live Demo

**[Try it live here!]([YOUR_RAILWAY_URL_HERE](https://feedbackanalyzer-production.up.railway.app))**

## Features

- **Single Feedback Analysis**: Paste individual feedback for instant AI-powered insights
- **Bulk CSV Analysis**: Upload CSV files to analyze hundreds of feedback entries at once
- **Comprehensive Insights**: Get sentiment analysis, key themes, pain points, and actionable recommendations
- **Modern UI**: Clean, responsive design with intuitive tabbed interface
- **Real-time Processing**: Fast analysis powered by Claude AI API

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **AI Integration**: Anthropic Claude API
- **File Processing**: CSV parsing with Papa Parse
- **Deployment**: Railway
- **Styling**: Custom CSS with modern design principles

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ckas-fh/user-feedback-analyzer.git
   cd user-feedback-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file
   echo "CLAUDE_API_KEY=your_api_key_here" > .env
   ```

4. **Run locally**
   ```bash
   npm start
   ```
   
   Visit `http://localhost:3000`

## API Key Setup

1. Get your Claude API key from [Anthropic Console](https://console.anthropic.com/)
2. Add it to your `.env` file as `CLAUDE_API_KEY=your_key_here`
3. Never commit your API key to version control

## Usage

### Single Analysis
1. Select the "Single Analysis" tab
2. Paste your feedback text
3. Click "Analyze Feedback"
4. View detailed insights including sentiment, themes, and recommendations

### Bulk Analysis
1. Select the "Bulk Analysis" tab
2. Upload a CSV file with feedback data
3. The system will process all entries and provide aggregate insights
4. Download results or view them in the interface

### CSV Format
Your CSV should have a column containing feedback text. The analyzer will automatically detect and process text columns.

## What It Analyzes

- **Sentiment**: Positive, negative, or neutral tone
- **Key Themes**: Main topics and recurring subjects
- **Pain Points**: Specific issues and complaints
- **Recommendations**: Actionable insights for improvement
- **Priority Levels**: Urgency assessment for different feedback types

## Deployment

This app is deployed on Railway. To deploy your own instance:

1. Fork this repository
2. Connect your Railway account to GitHub
3. Deploy from your forked repository
4. Add your `CLAUDE_API_KEY` environment variable in Railway dashboard

## Project Structure

```
feedback_analyzer/
├── server.js              # Express backend with Claude API integration
├── public/
│   └── index.html         # Frontend application
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (not in repo)
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Author

Built by [Caroline K](https://github.com/ckas-fh)

---

If you found this project helpful, please give it a star!
