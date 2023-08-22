import { open, FileHandle } from "node:fs/promises";
import { parse } from "csv-parse";

import ElasticSearch from "./services/ElasticSearch";

(async () => {
    let fd: FileHandle | undefined;
    let esService: ElasticSearch;

    const file = "sample-websites-company-names.csv";

    try {
        esService = new ElasticSearch();
        await esService.init();

        await esService.purgeESData();

        fd = await open(file);
        const parser = fd.createReadStream().pipe(parse({
            from: 2, //skip header
            columns: ["domain", "company_commercial_name", "company_legal_name", "company_all_available_names"],
        }));

        for await (const record of parser) {
            if (!record || !record.domain) {
                continue;
            }

            record.company_all_available_names = record.company_all_available_names.split(" | ")
            await esService.createDocument(record.domain, record);
        }

        console.log("Finished creating all documents");
    } catch (err) {
        console.log(err);
        process.exit(1);
    } finally {
        await fd?.close();
        process.exit(0);
    };
})();