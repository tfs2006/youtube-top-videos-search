// YouTube API Configuration
const API_KEY = 'YOUR_YOUTUBE_API_KEY'; // Replace with your YouTube API key

// Application settings
const RESULTS_PER_PAGE = 20;
const MAX_RESULTS = 50; // Maximum results to fetch from API

// Global variables
let currentKeyword = '';
let currentPage = 1;
let allVideos = [];
let filteredVideos = [];
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let darkMode = localStorage.getItem('darkMode') === 'true';

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const resultsContainer = document.getElementById('results-container');
    const loadingIndicator = document.getElementById('loading');
    const themeToggle = document.getElementById('theme-toggle');
    const toggleFilters = document.getElementById('toggle-filters');
    const filtersContainer = document.getElementById('filters-container');
    const resetFilters = document.getElementById('reset-filters');
    const dateFilter = document.getElementById('date-filter');
    const durationFilter = document.getElementById('duration-filter');
    const definitionFilter = document.getElementById('definition-filter');
    const captionFilter = document.getElementById('caption-filter');
    const sortSelect = document.getElementById('sort-select');
    const resultsStats = document.getElementById('results-stats');
    const favoritesContainer = document.getElementById('favorites-container');
    const favoritesList = document.getElementById('favorites-list');
    const paginationContainer = document.getElementById('pagination');
    const statisticsModal = document.getElementById('statistics-modal');
    const closeModal = document.getElementById('close-modal');

    // Initialize favorites
    updateFavoritesList();
    if (favorites.length > 0) {
        favoritesContainer.classList.add('active');
    }

    // Event Listeners
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    themeToggle.addEventListener('click', toggleTheme);
    
    toggleFilters.addEventListener('click', function() {
        filtersContainer.classList.toggle('active');
        toggleFilters.classList.toggle('active');
    });
    
    resetFilters.addEventListener('click', resetAllFilters);
    
    dateFilter.addEventListener('change', applyFilters);
    durationFilter.addEventListener('change', applyFilters);
    definitionFilter.addEventListener('change', applyFilters);
    captionFilter.addEventListener('change', applyFilters);
    
    sortSelect.addEventListener('change', function() {
        sortVideos(sortSelect.value);
        displayResults();
    });
    
    closeModal.addEventListener('click', function() {
        statisticsModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === statisticsModal) {
            statisticsModal.style.display = 'none';
        }
    });

    // Main search function
    function performSearch() {
        const keyword = searchInput.value.trim();
        if (!keyword) {
            showError('Please enter a search keyword');
            return;
        }

        currentKeyword = keyword;
        currentPage = 1;
        allVideos = [];
        filteredVideos = [];

        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        resultsContainer.innerHTML = '';
        paginationContainer.innerHTML = '';
        resultsStats.style.display = 'none';

        // Get date filter value
        let publishedAfter;
        switch(dateFilter.value) {
            case 'today':
                publishedAfter = getISODate(0);
                break;
            case 'week':
                publishedAfter = getISODate(7);
                break;
            case 'month':
                publishedAfter = getISODate(30);
                break;
            default:
                publishedAfter = getISODate(0);
        }

        // Fetch videos from YouTube API
        fetchVideos(keyword, publishedAfter);
    }

    // Function to fetch videos from YouTube API
    function fetchVideos(keyword, publishedAfter) {
        // Build the API URL
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&order=date&publishedAfter=${publishedAfter}&maxResults=${MAX_RESULTS}&key=${API_KEY}`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (!data.items || data.items.length === 0) {
                    showError('No videos found for your search');
                    loadingIndicator.classList.add('hidden');
                    return;
                }

                // Get video IDs for statistics and content details
                const videoIds = data.items.map(item => item.id.videoId).join(',');
                fetchVideoDetails(videoIds, data.items);
            })
            .catch(error => {
                console.error('Error fetching search results:', error);
                showError('Error fetching search results. Please try again later.');
                loadingIndicator.classList.add('hidden');
            });
    }

    // Function to fetch video statistics and content details
    function fetchVideoDetails(videoIds, searchResults) {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${API_KEY}`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Process and display results
                processResults(data.items, searchResults);
            })
            .catch(error => {
                console.error('Error fetching video details:', error);
                showError('Error fetching video details. Please try again later.');
                loadingIndicator.classList.add('hidden');
            });
    }

    // Function to process results
    function processResults(videoDetails, searchResults) {
        // Create a map of video IDs to their details
        const detailsMap = {};
        videoDetails.forEach(video => {
            detailsMap[video.id] = {
                statistics: video.statistics,
                contentDetails: video.contentDetails,
                publishedAt: video.snippet.publishedAt
            };
        });

        // Combine search results with video details
        allVideos = searchResults.map(item => {
            const videoId = item.id.videoId;
            const details = detailsMap[videoId];
            
            if (!details) return null;
            
            return {
                id: videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnailUrl: item.snippet.thumbnails.high.url,
                channelTitle: item.snippet.channelTitle,
                channelId: item.snippet.channelId,
                publishedAt: item.snippet.publishedAt,
                viewCount: parseInt(details.statistics?.viewCount || 0),
                likeCount: parseInt(details.statistics?.likeCount || 0),
                commentCount: parseInt(details.statistics?.commentCount || 0),
                duration: details.contentDetails?.duration || 'PT0S',
                definition: details.contentDetails?.definition || 'sd',
                caption: details.contentDetails?.caption === 'true'
            };
        }).filter(video => video !== null);

        // Apply initial filters and sorting
        applyFilters();
        
        // Show favorites if we have search results
        if (favorites.length > 0) {
            favoritesContainer.classList.add('active');
        }
        
        // Add current search to favorites button
        const saveSearchButton = document.createElement('button');
        saveSearchButton.className = 'action-button';
        saveSearchButton.innerHTML = `<i class="fas fa-bookmark action-icon"></i> Save this search`;
        saveSearchButton.addEventListener('click', function() {
            saveSearch(currentKeyword);
        });
        
        // Add to results stats
        const saveSearchContainer = document.createElement('div');
        saveSearchContainer.appendChild(saveSearchButton);
        resultsStats.appendChild(saveSearchContainer);
        
        // Display results
        loadingIndicator.classList.add('hidden');
        resultsStats.style.display = 'flex';
    }

    // Function to apply filters
    function applyFilters() {
        // Get filter values
        const dateValue = dateFilter.value;
        const durationValue = durationFilter.value;
        const definitionValue = definitionFilter.value;
        const captionValue = captionFilter.value;
        
        // Filter videos
        filteredVideos = allVideos.filter(video => {
            // Date filter
            if (dateValue === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const publishDate = new Date(video.publishedAt);
                publishDate.setHours(0, 0, 0, 0);
                if (publishDate.getTime() !== today.getTime()) return false;
            } else if (dateValue === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const publishDate = new Date(video.publishedAt);
                if (publishDate < weekAgo) return false;
            } else if (dateValue === 'month') {
                const monthAgo = new Date();
                monthAgo.setDate(monthAgo.getDate() - 30);
                const publishDate = new Date(video.publishedAt);
                if (publishDate < monthAgo) return false;
            }
            
            // Duration filter
            if (durationValue !== 'any') {
                const durationSeconds = parseDuration(video.duration);
                if (durationValue === 'short' && durationSeconds >= 240) return false;
                if (durationValue === 'medium' && (durationSeconds < 240 || durationSeconds > 1200)) return false;
                if (durationValue === 'long' && durationSeconds <= 1200) return false;
            }
            
            // Definition filter
            if (definitionValue !== 'any' && video.definition !== definitionValue) return false;
            
            // Caption filter
            if (captionValue !== 'any') {
                const hasCaptions = video.caption === true;
                if (captionValue === 'true' && !hasCaptions) return false;
                if (captionValue === 'false' && hasCaptions) return false;
            }
            
            return true;
        });
        
        // Sort videos based on current sort selection
        sortVideos(sortSelect.value);
        
        // Update results count
        document.querySelector('.results-count').textContent = `${filteredVideos.length} results found`;
        
        // Reset to first page
        currentPage = 1;
        
        // Display results
        displayResults();
    }

    // Function to sort videos
    function sortVideos(sortBy) {
        switch(sortBy) {
            case 'views':
                filteredVideos.sort((a, b) => b.viewCount - a.viewCount);
                break;
            case 'date':
                filteredVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
                break;
            case 'rating':
                filteredVideos.sort((a, b) => {
                    const ratingA = a.likeCount / (a.viewCount || 1);
                    const ratingB = b.likeCount / (b.viewCount || 1);
                    return ratingB - ratingA;
                });
                break;
        }
    }

    // Function to display results with pagination
    function displayResults() {
        resultsContainer.innerHTML = '';
        
        if (filteredVideos.length === 0) {
            showError('No videos match your filters. Try adjusting your search criteria.');
            paginationContainer.innerHTML = '';
            return;
        }
        
        // Calculate pagination
        const totalPages = Math.ceil(filteredVideos.length / RESULTS_PER_PAGE);
        const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
        const endIndex = Math.min(startIndex + RESULTS_PER_PAGE, filteredVideos.length);
        
        // Get current page videos
        const currentVideos = filteredVideos.slice(startIndex, endIndex);
        
        // Display videos
        currentVideos.forEach(video => {
            const videoCard = createVideoCard(video);
            resultsContainer.appendChild(videoCard);
        });
        
        // Create pagination
        createPagination(totalPages);
    }

    // Function to create a video card
    function createVideoCard(video) {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        
        const durationFormatted = formatDuration(video.duration);
        const viewsFormatted = formatNumber(video.viewCount);
        const dateFormatted = formatDate(video.publishedAt);
        
        videoCard.innerHTML = `
            <div class="thumbnail-container">
                <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">
                    <img class="thumbnail" src="${video.thumbnailUrl}" alt="${video.title}" loading="lazy">
                </a>
                <div class="video-duration">${durationFormatted}</div>
            </div>
            <div class="video-info">
                <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" class="video-title">${video.title}</a>
                <div class="video-channel">
                    <img class="channel-icon" src="https://i.ytimg.com/vi/${video.id}/default.jpg" alt="${video.channelTitle}">
                    <a href="https://www.youtube.com/channel/${video.channelId}" target="_blank" class="channel-name">${video.channelTitle}</a>
                </div>
                <div class="video-stats">
                    <span>${viewsFormatted} views</span>
                    <span>${dateFormatted}</span>
                </div>
                <div class="video-actions">
                    <button class="action-button stats-button" data-video-id="${video.id}">
                        <i class="fas fa-chart-bar action-icon"></i> Stats
                    </button>
                    <button class="action-button share-button" data-video-id="${video.id}">
                        <i class="fas fa-share-alt action-icon"></i> Share
                    </button>
                    <button class="action-button save-button" data-video-id="${video.id}">
                        <i class="fas fa-bookmark action-icon"></i> Save
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners to buttons
        const statsButton = videoCard.querySelector('.stats-button');
        statsButton.addEventListener('click', function() {
            showStatistics(video);
        });
        
        const shareButton = videoCard.querySelector('.share-button');
        shareButton.addEventListener('click', function() {
            shareVideo(video.id);
        });
        
        return videoCard;
    }

    // Function to create pagination
    function createPagination(totalPages) {
        paginationContainer.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-button';
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                displayResults();
                window.scrollTo(0, resultsStats.offsetTop - 20);
            }
        });
        paginationContainer.appendChild(prevButton);
        
        // Page buttons
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = 'pagination-button' + (i === currentPage ? ' active' : '');
            pageButton.textContent = i;
            pageButton.addEventListener('click', function() {
                currentPage = i;
                displayResults();
                window.scrollTo(0, resultsStats.offsetTop - 20);
            });
            paginationContainer.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-button';
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                displayResults();
                window.scrollTo(0, resultsStats.offsetTop - 20);
            }
        });
        paginationContainer.appendChild(nextButton);
    }

    // Function to show video statistics
    function showStatistics(video) {
        // Update statistics values
        document.getElementById('stat-views').textContent = formatNumber(video.viewCount);
        document.getElementById('stat-likes').textContent = formatNumber(video.likeCount);
        document.getElementById('stat-comments').textContent = formatNumber(video.commentCount);
        document.getElementById('stat-duration').textContent = formatDuration(video.duration);
        
        // Create chart
        const chartContainer = document.getElementById('statistics-chart');
        chartContainer.innerHTML = '<canvas id="viewsChart"></canvas>';
        
        // Sample data for demonstration
        const ctx = document.getElementById('viewsChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Views', 'Likes', 'Comments'],
                datasets: [{
                    label: 'Video Statistics',
                    data: [video.viewCount, video.likeCount, video.commentCount],
                    backgroundColor: [
                        'rgba(255, 0, 0, 0.7)',
                        'rgba(0, 128, 255, 0.7)',
                        'rgba(0, 200, 83, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 0, 0, 1)',
                        'rgba(0, 128, 255, 1)',
                        'rgba(0, 200, 83, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatNumber(value);
                            }
                        }
                    }
                }
            }
        });
        
        // Show modal
        statisticsModal.style.display = 'flex';
    }

    // Function to share video
    function shareVideo(videoId) {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // Check if Web Share API is available
        if (navigator.share) {
            navigator.share({
                title: 'Check out this YouTube video',
                url: videoUrl
            }).catch(console.error);
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(videoUrl).then(function() {
                alert('Video link copied to clipboard!');
            }).catch(function() {
                // If clipboard fails, prompt user to copy manually
                prompt('Copy this link to share the video:', videoUrl);
            });
        }
    }

    // Function to save search to favorites
    function saveSearch(keyword) {
        if (!favorites.includes(keyword)) {
            favorites.push(keyword);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            updateFavoritesList();
            favoritesContainer.classList.add('active');
        }
    }

    // Function to update favorites list
    function updateFavoritesList() {
        favoritesList.innerHTML = '';
        
        favorites.forEach(keyword => {
            const favoriteItem = document.createElement('div');
            favoriteItem.className = 'favorite-item';
            favoriteItem.innerHTML = `
                <span class="favorite-text">${keyword}</span>
                <button class="favorite-remove" data-keyword="${keyword}">×</button>
            `;
            
            favoriteItem.addEventListener('click', function(e) {
                if (e.target.classList.contains('favorite-remove')) {
                    removeFavorite(e.target.dataset.keyword);
                } else {
                    searchInput.value = keyword;
                    performSearch();
                }
            });
            
            favoritesList.appendChild(favoriteItem);
        });
    }

    // Function to remove favorite
    function removeFavorite(keyword) {
        favorites = favorites.filter(k => k !== keyword);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavoritesList();
        
        if (favorites.length === 0) {
            favoritesContainer.classList.remove('active');
        }
    }

    // Function to toggle theme
    function toggleTheme() {
        darkMode = !darkMode;
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        localStorage.setItem('darkMode', darkMode);
    }

    // Function to reset all filters
    function resetAllFilters() {
        dateFilter.value = 'today';
        durationFilter.value = 'any';
        definitionFilter.value = 'any';
        captionFilter.value = 'any';
        applyFilters();
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
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            return `${Math.floor(diffDays / 7)} weeks ago`;
        } else if (diffDays < 365) {
            return `${Math.floor(diffDays / 30)} months ago`;
        } else {
            return `${Math.floor(diffDays / 365)} years ago`;
        }
    }

    // Helper function to parse ISO 8601 duration
    function parseDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        
        const hours = (match[1] && parseInt(match[1])) || 0;
        const minutes = (match[2] && parseInt(match[2])) || 0;
        const seconds = (match[3] && parseInt(match[3])) || 0;
        
        return hours * 3600 + minutes * 60 + seconds;
    }

    // Helper function to format duration
    function formatDuration(duration) {
        const seconds = parseDuration(duration);
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    // Helper function to get ISO date for X days ago
    function getISODate(daysAgo) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
    }
});
