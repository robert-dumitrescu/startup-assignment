import isReachable from "is-reachable";
import RabbitMQService from "./services/RabbitService";
import Crawler from "./services/Crawler";
import Scraper from "./services/Scraper";
import ElasticSearch from "./services/ElasticSearch";

let rabbitService: RabbitMQService;
let elasticService: ElasticSearch;
let crawler: Crawler;

const consumer = async (domain: string) => {
    if (!domain) {
        return;
    }

    try {
        let scraper = new Scraper(domain);

        //absolute minimal domain check - no need to try and scrape unavailable domains
        if (await isReachable(domain)) {
            await crawler.crawlDomain(`https://${domain}`, scraper.scrapePage);
        } else {
            throw new Error("Domain unreachable");
        }

        let data = scraper.getScrapedData();
        console.log(data);

        if (!data.phoneNumbers.length && !data.socialMediaLinks.length) {
            //we managed to extract no data from the website, marking it as failed
            throw new Error("Failed to find any data");
        }

        await elasticService.upsertScrapedData(domain, data);
    } catch (err) {
        console.log("Failed to crawl: ", domain, err);
        throw err;  //bubble up the error to the RabbitService so we can nack the message
    }
}

(async () => {
    rabbitService = new RabbitMQService();
    await rabbitService.init();
    elasticService = new ElasticSearch();
    await elasticService.init();

    rabbitService.setPrefetchSize(1);   //ensure we only process one domain at a time - we could increase this but it would take some changes to the Crawler class

    crawler = new Crawler();

    await rabbitService.receiveMessage(consumer);
})();