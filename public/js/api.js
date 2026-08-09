const api = axios.create({
    baseURL: '/',
    withCredentials: true
});

// Separate instance for refresh to avoid infinite loops
const refreshApi = axios.create({
    baseURL: '/',
    withCredentials: true
});

let isRefreshing = false;
let queue = [];

const processQueue = (error) => {
    queue.forEach(p => error ? p.reject(error) : p.resolve());
    queue = [];
};

api.interceptors.response.use(
    res => res,
    async error => {
        const req = error.config;

        // If it's a 401 and we haven't retried yet
        if (error.response?.status === 401 && !req._retry) {
            console.log('401 detected for:', req.url);

            if (isRefreshing) {
                console.log('Refresh already in progress, queuing request');
                return new Promise((resolve, reject) => {
                    queue.push({ resolve, reject });
                }).then(() => api(req));
            }

            req._retry = true;
            isRefreshing = true;

            try {
                console.log('Attempting to refresh token...');
                // Use the separate refreshApi instance
                await refreshApi.post('/api/auth/refresh');
                console.log('Token refreshed successfully');
                processQueue();
                return api(req);
            } catch (err) {
                console.error('Token refresh failed:', err.response?.data || err.message);
                processQueue(err);
                // Only redirect if it's NOT a login/logout request
                if (!req.url.includes('/api/auth/login') && !req.url.includes('/api/auth/logout')) {
                    window.location.href = '/login';
                }
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

window.api = api;
