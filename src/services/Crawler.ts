import { EnqueueStrategy, PlaywrightCrawler } from "crawlee";

class Crawler {
    MAX_PAGES_PER_DOMAIN = parseInt(process.env.MAX_PAGES_PER_DOMAIN || "") || 10;

    async crawlDomain(domain: string, scrapePage: Function) {
        let crawler = new PlaywrightCrawler({
            launchContext: {
                launchOptions: {
                    args: ["--ignore-certificate-errors", "--ignore-https-errors"],
                }
            },
            maxRequestsPerCrawl: this.MAX_PAGES_PER_DOMAIN,
            async requestHandler({page, enqueueLinks}) {
                await page.waitForLoadState();
                await scrapePage(page);
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