// Main application JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const resultsContainer = document.getElementById('results-container');
    const loadingIndicator = document.getElementById('loading');

    // Add event listener for search button
    searchButton.addEventListener('click', performSearch);
    
    // Add event listener for Enter key in search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Main search function
    function performSearch() {
        const keyword = searchInput.value.trim();
        if (!keyword) {
            showError('Please enter a search keyword');
            return;
        }

        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        resultsContainer.innerHTML = '';

        // Get today's date in ISO format (YYYY-MM-DDT00:00:00Z)
        const today = new Date();
        const todayISO = today.toISOString().split('T')[0] + 'T00:00:00Z';

        // Fetch videos from YouTube API
        fetchVideos(keyword, todayISO);
    }

    // Function to fetch videos from YouTube API
    function fetchVideos(keyword, publishedAfter) {
        // Build the API URL
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&order=date&publishedAfter=${publishedAfter}&maxResults=50&key=${API_KEY}`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (!data.items || data.items.length === 0) {
                    showError('No videos found for your search today');
                    loadingIndicator.classList.add('hidden');
                    return;
                }

                // Get video IDs for statistics
                const videoIds = data.items.map(item => item.id.videoId).join(',');
                fetchVideoStatistics(videoIds, data.items);
            })
            .catch(error => {
                console.error('Error fetching search results:', error);
                showError('Error fetching search results. Please try again later.');
                loadingIndicator.classList.add('hidden');
            });
    }

    // Function to fetch video statistics (including view counts)
    function fetchVideoStatistics(videoIds, searchResults) {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${API_KEY}`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Process and display results
                processAndDisplayResults(data.items, searchResults);
            })
            .catch(error => {
                console.error('Error fetching video statistics:', error);
                showError('Error fetching video details. Please try again later.');
                loadingIndicator.classList.add('hidden');
            });
    }

    // Function to process and display results
    function processAndDisplayResults(videoStats, searchResults) {
        // Create a map of video IDs to their statistics
        const statsMap = {};
        videoStats.forEach(video => {
            statsMap[video.id] = {
                viewCount: parseInt(video.statistics.viewCount) || 0,
                likeCount: parseInt(video.statistics.likeCount) || 0,
                publishedAt: video.snippet.publishedAt
            };
        });

        // Filter videos published today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayVideos = searchResults.filter(item => {
            const publishDate = new Date(item.snippet.publishedAt);
            publishDate.setHours(0, 0, 0, 0);
            return publishDate.getTime() === today.getTime() && statsMap[item.id.videoId];
        });

        // Sort by view count (highest first)
        todayVideos.sort((a, b) => {
            return statsMap[b.id.videoId].viewCount - statsMap[a.id.videoId].viewCount;
        });

        // Take top 20 videos
        const top20Videos = todayVideos.slice(0, 20);

        // Clear results and hide loading
        resultsContainer.innerHTML = '';
        loadingIndicator.classList.add('hidden');

        if (top20Videos.length === 0) {
            showError('No videos found published today for your search');
            return;
        }

        // Display the videos
        top20Videos.forEach(video => {
            const videoId = video.id.videoId;
            const stats = statsMap[videoId];
            
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            
            videoCard.innerHTML = `
                <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">
                    <img class="thumbnail" src="${video.snippet.thumbnails.high.url}" alt="${video.snippet.title}">
                </a>
                <div class="video-info">
                    <div class="video-title">${video.snippet.title}</div>
                    <div class="video-channel">${video.snippet.channelTitle}</div>
                    <div class="video-stats">
                        <span>${formatNumber(stats.viewCount)} views</span>
                        <span>${formatDate(video.snippet.publishedAt)}</span>
                    </div>
                </div>
            `;
            
            resultsContainer.appendChild(videoCard);
        });
    }

    // Helper function to show error messages
    function showError(message) {
        resultsContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }

    // Helper function to format numbers (e.g., 1000 -> 1K)
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // Helper function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
});
