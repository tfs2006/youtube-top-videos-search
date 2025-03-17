# YouTube Top Videos Search Website - Documentation

## Overview
This documentation provides information about the YouTube Top Videos Search website that has been created using your YouTube API key. The website allows users to search for the top 20 videos with the most views posted on the current day based on a keyword search.

## Website URL
The website is deployed and accessible at: [https://tjbvmmac.manus.space](https://tjbvmmac.manus.space)

## Features
- Search for YouTube videos using keywords
- Automatically filters for videos published on the current day
- Sorts results by view count (highest first)
- Displays the top 20 videos with the most views
- Responsive design that works on desktop and mobile devices
- Shows video thumbnails, titles, channel names, view counts, and publication dates
- Direct links to videos on YouTube

## How to Use
1. Visit the website at [https://tjbvmmac.manus.space](https://tjbvmmac.manus.space)
2. Enter a keyword or phrase in the search box
3. Click the "Search" button or press Enter
4. The website will display the top 20 videos with the most views that were published today matching your search term
5. Click on any video thumbnail or title to watch the video on YouTube

## Technical Details
- The website uses the YouTube Data API v3 to fetch video data
- Your API key is stored in the config.js file
- The website makes two API calls:
  1. First to search for videos matching the keyword published today
  2. Second to fetch statistics (view counts) for those videos
- Results are filtered to include only videos published on the current day
- Results are sorted by view count in descending order
- The top 20 videos are displayed in a responsive grid layout

## API Usage Considerations
- The YouTube Data API has usage quotas (typically 10,000 units per day for free)
- Each search request uses approximately 100 units
- Each video statistics request uses approximately 1 unit per video
- With heavy usage, you may reach your daily quota limit
- Monitor your API usage in the Google Cloud Console if needed

## Setup and API Key Configuration
- The repository contains a sample configuration file (`js/config.sample.js`)
- To set up the project:
  1. Copy `js/config.sample.js` to `js/config.js`
  2. Edit the `js/config.js` file
  3. Replace 'YOUR_YOUTUBE_API_KEY' with your actual YouTube API key
  4. Save the file

- For security reasons:
  - The actual `config.js` file is excluded from the GitHub repository via `.gitignore`
  - Never commit your API key to version control
  - Keep your API key private and secure

## Maintenance
- If you need to change the API key:
  1. Edit the `js/config.js` file
  2. Replace the existing API key with your new key
  3. Redeploy the website

- If the API key is compromised:
  1. Revoke the old key in your Google Cloud Console
  2. Generate a new key
  3. Update the website as described above

## Limitations
- The website can only display videos published on the current day
- Results are limited to the top 20 videos by view count
- The YouTube API may not return all videos published on the current day due to indexing delays
- Very recent videos (published within the last few hours) may have low view counts and not appear in the results

## Source Code
The website consists of the following files:
- `index.html`: Main HTML structure
- `css/styles.css`: Styling for the website
- `js/config.js`: Contains your YouTube API key
- `js/app.js`: Main application logic

## Support
If you encounter any issues with the website or have questions about its functionality, please contact the developer for assistance.

## Privacy Considerations
- The website does not collect or store any user data
- Search queries are sent directly to the YouTube API
- No cookies or local storage are used to track user activity
