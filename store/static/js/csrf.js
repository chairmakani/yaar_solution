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

// Add this function
function addCSRFToken(headers = {}) {
    const token = getCSRFToken();
    if (token) {
        return {
            ...headers,
            'X-CSRFToken': token,
            'Content-Type': 'application/json'
        };
    }
    return headers;
}

// Add CSRF token to fetch requests
function fetchWithCSRF(url, options = {}) {
    const token = getCSRFToken();
    if (!token) {
        console.error('CSRF token not found');
        throw new Error('CSRF token not found');
    }

    return fetch(url, {
        ...options,
        credentials: 'same-origin',
        headers: {
            ...options.headers,
            'X-CSRFToken': token,
            'Accept': 'application/json'
        }
    });
}
