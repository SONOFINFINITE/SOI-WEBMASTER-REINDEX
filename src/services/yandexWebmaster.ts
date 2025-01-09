import axios from 'axios';

const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://soi-webmaster-reindex.onrender.com/v4'
    : 'http://localhost:3000/api';

interface YandexUser {
    user_id: number;
    login: string;
}

interface Host {
    host_id: string;
    ascii_host_url: string;
    unicode_host_url: string;
    verified: boolean;
}

interface QuotaInfo {
    daily_quota: number;
    quota_remainder: number;
}

class YandexWebmasterAPI {
    private token: string;
    private userId: string | null = null;

    constructor(token: string = '') {
        this.token = token;
    }

    setToken(token: string) {
        this.token = token;
        this.userId = null; // Сбрасываем userId при смене токена
    }

    private async request(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
        if (!this.token) {
            throw new Error('API token not set');
        }

        try {
            console.log('Making request:', {
                method,
                url: `${BASE_URL}${endpoint}`,
                data
            });

            const response = await axios({
                method,
                url: `${BASE_URL}${endpoint}`,
                headers: {
                    Authorization: `OAuth ${this.token}`,
                },
                data,
            });
            return response.data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async getUserInfo(): Promise<YandexUser> {
        const user = await this.request('/user');
        this.userId = user.user_id.toString();
        return user;
    }

    async getHosts(): Promise<Host[]> {
        if (!this.userId) {
            await this.getUserInfo();
        }
        const response = await this.request(`/user/${this.userId}/hosts`);
        return response.hosts;
    }

    async findHostIdByDomain(domain: string): Promise<string | null> {
        const hosts = await this.getHosts();
        console.log('Available hosts:', hosts);
        
        const host = hosts.find(h => {
            const normalizedHostUrl = h.ascii_host_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
            const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
            console.log('Comparing:', { normalizedHostUrl, normalizedDomain });
            return normalizedHostUrl === normalizedDomain;
        });

        return host ? host.host_id : null;
    }

    async checkQuota(hostId: string): Promise<QuotaInfo> {
        if (!this.userId) {
            await this.getUserInfo();
        }
        const response = await this.request(`/user/${this.userId}/hosts/${hostId}/recrawl/quota`);
        return response;
    }

    extractDomain(url: string): string {
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
            return urlObj.hostname;
        } catch (error) {
            console.error('Invalid URL:', url);
            throw new Error('Invalid URL format');
        }
    }

    async recrawlUrls(urls: string[]): Promise<{ success: string[]; failed: string[]; quotaExceeded: string[] }> {
        if (!this.userId) {
            await this.getUserInfo();
        }

        const results = {
            success: [] as string[],
            failed: [] as string[],
            quotaExceeded: [] as string[]
        };

        // Group URLs by domain
        const urlsByDomain = urls.reduce((acc, url) => {
            const domain = this.extractDomain(url);
            if (!acc[domain]) {
                acc[domain] = [];
            }
            acc[domain].push(url.startsWith('http') ? url : `https://${url}`);
            return acc;
        }, {} as Record<string, string[]>);

        // Process each domain
        for (const [domain, domainUrls] of Object.entries(urlsByDomain)) {
            try {
                const hostId = await this.findHostIdByDomain(domain);
                if (!hostId) {
                    console.error(`Host not found for domain: ${domain}`);
                    domainUrls.forEach(url => results.failed.push(url));
                    continue;
                }

                // Check quota before processing URLs
                const quota = await this.checkQuota(hostId);
                console.log(`Quota for ${domain}:`, quota);

                if (quota.quota_remainder <= 0) {
                    console.log(`Quota exceeded for domain ${domain}`);
                    domainUrls.forEach(url => results.quotaExceeded.push(url));
                    continue;
                }

                console.log('Sending recrawl requests for host:', hostId);
                
                // Send individual recrawl request for each URL
                for (const url of domainUrls) {
                    try {
                        if (quota.quota_remainder <= 0) {
                            results.quotaExceeded.push(url);
                            continue;
                        }

                        await this.request(
                            `/user/${this.userId}/hosts/${hostId}/recrawl/queue`,
                            'POST',
                            { url }
                        );
                        results.success.push(url);
                        quota.quota_remainder--; // Уменьшаем оставшуюся квоту
                    } catch (error) {
                        console.error(`Failed to recrawl URL ${url}:`, error);
                        results.failed.push(url);
                    }
                }
            } catch (error) {
                console.error(`Failed to process domain ${domain}:`, error);
                domainUrls.forEach(url => results.failed.push(url));
            }
        }

        return results;
    }
}

export const yandexWebmaster = new YandexWebmasterAPI();
