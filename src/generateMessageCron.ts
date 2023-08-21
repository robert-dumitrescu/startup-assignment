import { open, FileHandle } from "node:fs/promises";
import { parse } from "csv-parse";

import RabbitMQService from "./services/rabbitService";

(async () => {
    let fd: FileHandle | undefined;
    let rabbitService: RabbitMQService | undefined;

    const file = "sample-websites.csv";

    try {
        rabbitService = new RabbitMQService();
        await rabbitService.init();

        fd = await open(file);
        const parser = fd.createReadStream().pipe(parse({
            from: 2, //skip header
            to: 5,  //only use a couple of domains for testing
            columns: ["domain"],
        }));

        for await (const record of parser) {
            if (!record || !record.domain) {
                continue;
            }

            await rabbitService.sendMessage(record.domain);
        }
    } catch (err) {
        console.log(err);
        process.exit(1);
    } finally {
        await fd?.close();
        await rabbitService?.close();
        process.exit(0);
    };
})();