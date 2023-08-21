import { EnqueueStrategy, CheerioCrawler } from "crawlee";

class Crawler {
    MAX_PAGES_PER_DOMAIN = parseInt(process.env.MAX_PAGES_PER_DOMAIN || "") || 10;

    async crawlDomain(domain: string) {
        let crawler = new CheerioCrawler({
            maxRequestsPerCrawl: this.MAX_PAGES_PER_DOMAIN,
            async requestHandler({$, enqueueLinks}) {
                await enqueueLinks({
                    strategy: EnqueueStrategy.SameHostname,
                });
            },
        });

        await crawler.run([domain]);

        //https://github.com/apify/crawlee/discussions/1970
        // Drop the queue to prevent the crawler from reusing existing visited urls
        const requestQueue = await crawler.getRequestQueue();
        await requestQueue.drop();

        await crawler.teardown();
    }
}

export default Crawler;