const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Your Claude API key from environment variable
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper function to parse CSV properly
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    const result = [];
    
    for (const line of lines) {
        const row = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i += 2;
                } else {
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }
        
        row.push(current.trim());
        result.push(row);
    }
    
    return result;
}

// Helper function to detect feedback columns
function detectFeedbackColumns(headers) {
    const feedbackKeywords = [
        'feedback', 'comment', 'review', 'text', 'message', 'description', 
        'note', 'remarks', 'opinion', 'thoughts', 'experience', 'issue',
        'complaint', 'suggestion', 'recommendation', 'testimonial'
    ];
    
    const detectedColumns = [];
    
    headers.forEach((header, index) => {
        const headerLower = header.toLowerCase().replace(/[^a-z]/g, '');
        const isMatch = feedbackKeywords.some(keyword => 
            headerLower.includes(keyword) || keyword.includes(headerLower)
        );
        
        if (isMatch) {
            detectedColumns.push(index);
        }
    });
    
    if (detectedColumns.length === 0) {
        return [0];
    }
    
    return detectedColumns;
}

// API endpoint to analyze single feedback
app.post('/api/analyze', async (req, res) => {
    try {
        const { feedback } = req.body;
        
        if (!feedback || !feedback.trim()) {
            return res.status(400).json({ error: 'No feedback provided' });
        }

        console.log('Analyzing feedback:', feedback.substring(0, 100) + '...');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1200,
                messages: [{
                    role: 'user',
                    content: `Analyze this customer feedback quickly and concisely:

"${feedback}"

Respond with JSON only:
{
    "sentiment": {
        "overall": "Positive|Negative|Mixed|Neutral",
        "positive": number,
        "negative": number, 
        "neutral": number
    },
    "issues": [
        {
            "category": "Bug|Feature|Support|Performance|UI|Positive",
            "description": "Brief description",
            "priority": "high|medium|low",
            "severity": "critical|major|minor"
        }
    ],
    "actionItems": [
        "Action 1",
        "Action 2"
    ],
    "summary": "One sentence summary"
}

Keep descriptions under 15 words. Make percentages add to 100.`
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API Error:', response.status, errorText);
            return res.status(response.status).json({ 
                error: `Claude API Error: ${response.status}`,
                details: errorText
            });
        }

        const data = await response.json();
        const analysisText = data.content[0].text;
        
        let analysis;
        try {
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Raw response:', analysisText);
            return res.status(500).json({ 
                error: 'Invalid response format from Claude API',
                rawResponse: analysisText.substring(0, 500)
            });
        }

        console.log('Analysis completed successfully');
        res.json(analysis);

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

// Bulk analysis endpoint
app.post('/api/analyze-bulk', async (req, res) => {
    try {
        const { csvData } = req.body;
        
        if (!csvData || !csvData.trim()) {
            return res.status(400).json({ error: 'No CSV data provided' });
        }

        console.log('Starting bulk analysis...');

        let parsedData;
        try {
            parsedData = parseCSV(csvData);
        } catch (error) {
            return res.status(400).json({ 
                error: 'Failed to parse CSV file',
                details: 'Please ensure the file is properly formatted as a comma-separated values file.'
            });
        }

        if (parsedData.length < 2) {
            return res.status(400).json({ 
                error: 'CSV file appears to be empty or has insufficient data',
                details: 'Please ensure your CSV has at least a header row and one data row.'
            });
        }

        const headers = parsedData[0];
        const feedbackColumns = detectFeedbackColumns(headers);
        const dataRows = parsedData.slice(1);

        console.log(`Detected ${feedbackColumns.length} feedback columns:`, feedbackColumns.map(i => headers[i]));

        const feedbackEntries = [];
        const maxSampleSize = 50;
        
        for (let i = 0; i < Math.min(dataRows.length, maxSampleSize); i++) {
            const row = dataRows[i];
            
            const feedbackParts = feedbackColumns
                .map(colIndex => row[colIndex] || '')
                .filter(text => text && text.length > 10)
                .map(text => text.replace(/["\r\n]+/g, ' ').trim());
            
            if (feedbackParts.length > 0) {
                feedbackEntries.push(feedbackParts.join(' | '));
            }
        }

        if (feedbackEntries.length === 0) {
            return res.status(400).json({ 
                error: 'No valid feedback found in CSV',
                details: `Checked columns: ${feedbackColumns.map(i => headers[i] || `Column ${i}`).join(', ')}. Ensure these columns contain substantial text content (more than 10 characters).`
            });
        }

        console.log(`Extracted ${feedbackEntries.length} valid feedback entries for analysis`);

        const sampleFeedback = feedbackEntries.slice(0, 25).join('\n\n---FEEDBACK---\n\n');
        
        const bulkAnalysisResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 2500,
                messages: [{
                    role: 'user',
                    content: `Analyze this bulk customer feedback and provide comprehensive aggregate insights. 

DATASET INFO:
- Total feedback entries: ${feedbackEntries.length}
- Sample size analyzed: ${Math.min(feedbackEntries.length, 25)}
- Detected feedback columns: ${feedbackColumns.map(i => headers[i] || `Column ${i}`).join(', ')}

FEEDBACK SAMPLE:
${sampleFeedback}

Respond with JSON only:
{
    "aggregateSentiment": {
        "overall": "Positive|Negative|Mixed|Neutral",
        "positive": 30,
        "negative": 50,
        "neutral": 20
    },
    "issueCategories": [
        {
            "category": "Bug Reports",
            "description": "Technical issues and app crashes",
            "priority": "high",
            "severity": "critical",
            "frequency": 15
        },
        {
            "category": "Feature Requests",
            "description": "Users requesting new functionality",
            "priority": "medium",
            "severity": "minor",
            "frequency": 8
        }
    ],
    "strategicRecommendations": [
        "Address critical stability issues affecting 60% of users",
        "Prioritize mobile app performance improvements",
        "Implement user-requested export functionality"
    ],
    "executiveSummary": "Analysis of ${feedbackEntries.length} feedback entries reveals critical performance issues requiring immediate attention, with users particularly frustrated by app crashes and slow response times.",
    "priorityBreakdown": {
        "high": 5,
        "medium": 8,
        "low": 3
    }
}

Focus on:
1. Identifying the most common issues and their frequency
2. Categorizing feedback into actionable themes
3. Providing specific, concrete recommendations
4. Highlighting urgent vs. nice-to-have improvements
5. Make percentages add to 100 exactly`
                }]
            })
        });

        if (!bulkAnalysisResponse.ok) {
            const errorText = await bulkAnalysisResponse.text();
            console.error('Claude API Error:', bulkAnalysisResponse.status, errorText);
            throw new Error(`Claude API Error: ${bulkAnalysisResponse.status}`);
        }

        const bulkData = await bulkAnalysisResponse.json();
        const bulkAnalysisText = bulkData.content[0].text;
        
        let bulkAnalysis;
        try {
            const jsonMatch = bulkAnalysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                bulkAnalysis = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in Claude response');
            }
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Raw response:', bulkAnalysisText);
            throw new Error('Invalid bulk analysis response format from Claude API');
        }

        console.log('Bulk analysis completed successfully');
        
        bulkAnalysis.metadata = {
            totalEntries: feedbackEntries.length,
            totalRowsInCSV: dataRows.length,
            sampleAnalyzed: Math.min(feedbackEntries.length, 25),
            csvStructure: {
                explanation: `Found feedback in columns: ${feedbackColumns.map(i => headers[i] || `Column ${i}`).join(', ')}. Processed ${feedbackEntries.length} valid entries from ${dataRows.length} total rows.`,
                detectedColumns: feedbackColumns,
                headers: headers
            },
            processingDate: new Date().toISOString(),
            analysisScope: feedbackEntries.length < dataRows.length ? 
                `Analyzed ${feedbackEntries.length} entries with substantial content from ${dataRows.length} total rows` :
                `Analyzed all ${feedbackEntries.length} feedback entries`
        };

        res.json(bulkAnalysis);

    } catch (error) {
        console.error('Bulk Analysis Error:', error);
        res.status(500).json({ 
            error: 'Bulk analysis failed',
            message: error.message,
            details: 'This could be due to API limits, large file size, or malformed data. Try with a smaller file or check your CSV format.'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'Server is running!', 
        timestamp: new Date().toISOString(),
        endpoints: ['/api/analyze', '/api/analyze-bulk', '/api/health']
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from 'public' directory`);
    console.log(`🔧 API endpoints:`);
    console.log(`   - POST /api/analyze (single feedback)`);
    console.log(`   - POST /api/analyze-bulk (CSV upload)`);
    console.log(`   - GET  /api/health (health check)`);
    console.log(`💡 Make sure to place your HTML file in the 'public' directory`);
});