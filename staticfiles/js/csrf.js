function getCSRFToken() {
    // First try to get from cookie
    let token = document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

    // If not found in cookie, try meta tag
    if (!token) {
        token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    }

    return token || null;
}

function setupCSRFToken() {
    // Add CSRF token to all AJAX requests
    let token = getCSRFToken();
    if (token) {
        axios.defaults.headers.common['X-CSRFToken'] = token;
    }
}

// Add CSRF token to fetch requests
function fetchWithCSRF(url, options = {}) {
    const token = getCSRFToken();
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'X-CSRFToken': token,
        },
    });
}
