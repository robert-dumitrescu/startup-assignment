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
    data: {
        socialMediaLinks: Set<string>,
        phoneNumbers: Set<string>,
    };
    numbers: string[] | undefined;

    constructor(domain: string) {
        this.domain = domain;
        this.data = {
            socialMediaLinks: new Set(),
            phoneNumbers: new Set(),
        };
        this.numbers = [];

        this.scrapePage = this.scrapePage.bind(this);
    }

    async scrapePage(page: Page) {
        await this.extractSocialMediaLinks(page);
        await this.extractPhoneNumbers(page);
    }

    async extractSocialMediaLinks(page: Page) {
        const links = page.locator('a:visible');
        const count = await links.count();

        for (let i = 0; i < count; i++) {
            const href = await links.nth(i).getAttribute("href");
            if (!href) {
                continue;
            }

            Object.keys(this.SOCIAL_MEDIA_MATCHERS).forEach((socialMedia) => {
                this.SOCIAL_MEDIA_MATCHERS[socialMedia].forEach((regex) => {
                    if (href.match(regex)) {
                        this.data.socialMediaLinks.add(href);
                    }
                });
            });
        }
    }

    async extractPhoneNumbers(page: Page) {
        const body = await page.$('body');
        const text = await body?.innerText();

        if (!text) {
            return;
        }

        //TODO: switch this to an async approach as it can take a bit long
        let numbers = findPhoneNumbersInText(text, {defaultCountry: "US"});

        numbers.forEach((phoneNumber) => {
            this.data.phoneNumbers.add(phoneNumber.number.number.toString());
        });
    }

    getScrapedData() {
        return {
            socialMediaLinks: Array.from(this.data.socialMediaLinks),
            phoneNumbers: Array.from(this.data.phoneNumbers),
        }
    }
}

export default Scraper;