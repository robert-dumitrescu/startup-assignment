import RabbitMQService from "./services/RabbitService";
import Crawler from "./services/Crawler";
import Scraper from "./services/Scraper";

let rabbitService: RabbitMQService;
let crawler: Crawler;
let scraper: Scraper;

const consumer = async (message: string) => {
    if (!message) {
        return;
    }

    try {
        let scraper = new Scraper(message);
        await crawler.crawlDomain(`https://${message}`, scraper.scrapePage);
        //await crawler.crawlDomain(`http://${message}`, scraper.scrapePage);

        let data = scraper.getScrapedData();
        console.log(data);
    } catch (err) {
        console.log("Failed to crawl: ", message, err);
        throw err;  //bubble up the error to the RabbitService so we can nack the message
    }
}

(async () => {
    rabbitService = new RabbitMQService();
    await rabbitService.init();
    rabbitService.setPrefetchSize(1);   //ensure we only process one domain at a time - we could increase this but it would take some changes to the Crawler class

    crawler = new Crawler();

    await rabbitService.receiveMessage(consumer);
})();