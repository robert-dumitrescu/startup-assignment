import express, { Express, Request, Response } from 'express';
import { celebrate, Joi, errors, Segments } from 'celebrate';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import ElasticSearch from './services/ElasticSearch';

const app: Express = express();
const port = process.env.PORT || 3000;

const elasticService: ElasticSearch = new ElasticSearch();

const mapESDoc = (hits: SearchHit[]) => {
    if (!hits.length) {
        return [];
    }

    return hits.map((hit) => {
        const doc = hit._source as {[key: string]: any};
        return {
            domain: doc.domain,
            company_name: doc.company_commercial_name,
            socialMediaLinks: doc.socialMediaLinks,
            phoneNumbers: doc.phoneNumbers,
        };
    });
}

app.get("/searchCompany", celebrate({
    [Segments.QUERY]: {
        domain: Joi.string().trim().min(5).max(100).pattern(/[a-zA-Z0-9]{2,61}\.[a-zA-Z]{2,}$/),
        phoneNumber: Joi.string().trim().pattern(/\+?\d{5,15}/),
    }
}), async (req: Request, res: Response) => {
    if (!req.query.domain && !req.query.phoneNumber && !req.query.name) {
        return res.status(400).send({error: "Missing parameters"});
    }

    let params: {[key: string]: string} = {};
    if (req.query.domain) {
        params.domain = req.query.domain.toString();
    }
    if (req.query.phoneNumber) {
        params.phoneNumber = req.query.phoneNumber.toString();
    }

    const document = await elasticService.getDocumentByDomain(params);
    const company = mapESDoc(document);

    if (!company || !company.length) {
        return res.status(404).send({error: "No company found"});
    }

    res.send({company: company[0]});
});

app.use(errors());

app.listen(port, () => {
    elasticService.init();

    console.log(`️Server is running on ${port}`);
});