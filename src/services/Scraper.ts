import {Page} from 'playwright';
import { findPhoneNumbersInText } from 'libphonenumber-js/max';


class Scraper {
    SOCIAL_MEDIA_MATCHERS: {[key: string]: RegExp[]} = {
        FACEBOOK: [
            /facebook\.com\/.*/,
            /fb\.com\/.*/,
        ],
        INSTAGRAM: [
            /instagram\.com\/.*/,
        ],
        TWITTER: [
            /twitter\.com\/.*/,
        ],
    }

    domain: string;
    data: {[key: string]: string};
    numbers: string[] | undefined;

    constructor(domain: string) {
        this.domain = domain;
        this.data = {};
        this.numbers = [];

        this.scrapePage = this.scrapePage.bind(this);
    }

    async scrapePage(page: Page) {
        this.data = await this.extractSocialMediaLinks(page);
        this.numbers = await this.extractPhoneNumbers(page);
    }

    async extractSocialMediaLinks(page: Page) {
        const links = await page.locator('a:visible');
        const count = await links.count();
        const data: {[key: string]: string} = {};

        for (let i = 0; i < count; i++) {
            const href = await links.nth(i).getAttribute("href");
            Object.keys(this.SOCIAL_MEDIA_MATCHERS).forEach((socialMedia) => {
                this.SOCIAL_MEDIA_MATCHERS[socialMedia].forEach((regex) => {
                    if (href?.match(regex)) {
                        data[socialMedia] = href;
                    }
                });
            });
        }

        return data;
    }

    async extractPhoneNumbers(page: Page) {
        const body = await page.$('body');
        const text = await body?.innerText();

        if (!text) {
            return;
        }

        let numbers = findPhoneNumbersInText(text, {defaultCountry: "US"});
        if (!numbers?.length) {
            return;
        }

        return numbers.map((phoneNumber) => {
            return phoneNumber.number.number.toString();
        });
    }

    getScrapedData() {
        return this.data;
    }
}

export default Scraper;