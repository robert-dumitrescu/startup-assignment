import { Client } from "@elastic/elasticsearch";
import { QueryDslQueryContainer, SearchHit } from "@elastic/elasticsearch/lib/api/types";

class ElasticSearch {
    client!: Client;

    async init() {
        //this is a bad idea - we should setup certificates in order to securely communicate with Elasticsearch
        //but I consider this to be out of scope for now
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        if (!process.env.ES_PASS) {
            throw new Error("Missing Elasticsearch credentials");
        }

        this.client = new Client({
            node: `https://${process.env.ES_HOST || "localhost"}:9200`,
            auth: {
              username: "elastic",
              password: `${process.env.ES_PASS}`,
            },
        });
    }

    async purgeESData() {
        if (await this.client.indices.exists({
            index: "companies",
        })) {
            await this.client.indices.delete({
                index: "companies",
            });
        }

        await this.client.indices.create({
            index: "companies",
        });
    }

    async createDocument(domain: string, doc: any) {
        await this.client.index({
            index: "companies",
            id: domain,
            document: {
                url: domain,
                ...doc,
            }
        });
    }

    async upsertScrapedData(domain: string, scrapedData: {[key: string]: string[]}) {
        const exists = this.client.exists({
            index: "companies",
            id: domain,
        });

        if (!exists) {
            return this.createDocument(domain, scrapedData);
        }

        let existingDoc: any = (await this.client.get({
            index: "companies",
            id: domain,
        }))._source;

        Object.keys(scrapedData).forEach((key) => {
            if (existingDoc[key]) {
                let vals = new Set();

                existingDoc[key].forEach((v: string) => vals.add(v));
                scrapedData[key].forEach((v: string) => vals.add(v));

                existingDoc[key] = Array.from(vals);
            } else {
                existingDoc[key] = scrapedData[key];
            }
        });

        await this.client.update({
            index: "companies",
            id: domain,
            doc: {...existingDoc},
        });
    }

    async getDocumentByDomain(params: {[key: string]: string}): Promise<SearchHit[]> {
        //At this point I should start looking into an ORM or a querybuilder (https://www.npmjs.com/package/elastic-orm)
        let queries: QueryDslQueryContainer[] = [];

        if (params.domain) {
            queries.push({
                fuzzy: {
                    url: {
                        value: params.domain,
                    },
                },
            });
        }

        if (params.phoneNumber) {
            queries.push({
                fuzzy: {
                    phoneNumbers: {
                        value: params.phoneNumber,
                    },
                },
            });
        }

        let data = await this.client.search({
            index: "companies",
            query: {
                dis_max: {
                    queries: queries,
                },
            },
        });

        return data.hits.hits;
    }

}

export default ElasticSearch;