# Introduction
This is a proof of concept for a take at home assignment from a `$startup`.  
The task involves crawling a list of websites, scraping some data, pushing said data to a Elasticsearch and creating a basic API to query it.

Some mentions:  
* I'll try to keep things as simple as possible, but with an open mind to scalability and extensibility
* I'll keep the code for all the different components and yaml files in the same repo. I doubt it will get very messy for this PoC, but obviously don't do this in production. 

# Overall design
Right now (before actually writing any code - so things might change) the solution I'm imagining looks like this:  
1. Cron job periodically generates a message for each domain and pushes it to a RabbitMQ work queue
2. A (scalable) number of NodeJS workers receive a message each, and perform the following operations:
    * crawl the website
    * scrape the required data
    * push the data to Elasticsearch
3. Simple NodeJS API server to handle user requests

This whole infrastructure will live inside a local Kubernetes cluster managed by `minikube`.

# Going into details:

## Why a cron job
This might be a slight oversimplification, I'm sure `$startup` uses a different mechanism here, but for the sake of this PoC it will work fine, and maybe with some smart use of streams could be scaled up to millions of domains.  
Regardless, due to the separation provided by RabbitMQ it should be fairly easy to swap this component out for a more robust method of generating the messages, if needed in the future.

## RabbitMQ
My initial thought was to actually use a basic MySQL table with something like: `domain`, `state`, `last_crawled` (... other columns), and have each worker just select the first domain where the state is not crawled or has been last crawled more than a day or so. This approach would work fine for the PoC, but once you start scaling things up it becomes more painful to use and I'm sure we'll have to deal with deadlocks or race conditions.

I haven't touched RabbitMQ before, but it looks like it comes out of the box with really good scaling and queues that guarantee one message per worker so this is an overall better approach at the cost of working with an unfamiliar tech and maybe a more complex setup.

## Worker
I'll keep things simple here, just a basic wait for message loop or mechanism -> on receive message pass it to a Crawler class and get the HTML -> pass the HTML to a Scraper class to extract the data -> pass the data to an Elasticsearch class and send it to ES -> acknowledge the message. On error nack the message - we don't care *a lot* about what happens to the message next as the cron job will generate a new message for it at the next run anyway.

### Crawling
For crawling in NodeJS I found [crawlee](https://crawlee.dev/). It looks like the perfect tool for the job as it has multiple types of crawlers, HTTP & headless browsers, has anti-blocking features and out of the box scaling. What could I even want more?

### Scraping
*This is probably where I get disqualified.*

I know the idea would be to use AI / ML to extract the data as conventional methods are too flaky for this kind of unstructured data, but given my limited knowledge in the field and the limited time (I know there wasn't an imposed timeline but still ...) I chose to go the standard approach with a mix of regexes. If time allows I'll come back to this and try to find a way. Either way, I'll try to keep the code as modular as possible so that refactoring won't be a big issue.

* Social media links: lookup all the links in the HTML and use some very staight forward regexes to see if they match social media domains
* Phone numbers: I found this [libphonenumber-js](https://www.npmjs.com/package/libphonenumber-js) which looks like it can extract phone numbers from straight text, so I'm hoping I can use this
* Addresses: this is were things break down and AI is needed, but maybe [node-postal](https://www.npmjs.com/package/node-postal) can do it? Otherwise use a service like [geocode.xyz](https://geocode.xyz/api) but it's paid so it's a no go.

## Elasticsearch
Not much I can write about this, it was a soft requirement so I'll be using it to store the structured data
.
## Handling user requests
Again, nothing to write home about it, any basic server will do as long as it can interact with the Elasticsearch pods.


# Kubernetes setup

Requirements: `docker`, `docker-buildx`, `minikube` - setting these up is out of scope
1. start `minikube` with some decent resources: `minikube start --cpus 8 --memory 16384`
2. setup `RabbitMQ`:
    * install the cluster operator: `kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"`
    * create the actual cluster: `kubectl apply -f kubes/rabbitmq.yaml` - this is default hello-world RabbitMQ, it's sufficient for our PoC but might not be production ready
3. setup `Elasticsearch`:
    * `kubectl create -f https://download.elastic.co/downloads/eck/2.9.0/crds.yaml`
    * `kubectl apply -f https://download.elastic.co/downloads/eck/2.9.0/operator.yaml`
    * `kubectl apply -f kubes/elasticsearch.yaml`
4. Build the Docker images:
    * cronjob (execute the following commands in the root directory of the repo):
        - `eval $(minikube docker-env)`
        - `docker build -t cronjob -f cronjob.Dockerfile .`
        - `docker build -t worker -f worker.Dockerfile .`
5. Deploy on Kubernetes:
    * `kubectl apply -f kubes/cronjob.yaml`


# One shot task to populate the Elasticseach cluster
I was provided with some data already scraped from the websites and I feel like the spirit of the challenge was to merge the data with my scraped data on the Elasticsearch cluster, rather than parsing the csv then adding the scraped data and pushing it in one go. (The scenario I have in mind is maybe there are different crawlers looking for different types of data so we don't know exactly how the schema will look in the end)
For this I wrote a super simple script that just reads the csv file, purges whatever data is already on Elasticsearch and pushes the provided data.
In order to run it from the local machine you need to do the following:
- forward the elasticsearch port (in a separate terminal): `kubectl port-forward service/elasticsearch-es-http 9200`
- extract the password in an env variable: `ELASTICSEARCH_PASS=$(kubectl get secret elasticsearch-es-elastic-user -o go-template='{{.data.elastic | base64decode}}')`
- compile the typescript code: `npx tsc --project ./`
- run the actual task: `ES_PASS=$ES_PASS node build/populateESOneShot.js`

# Work logs:
Monday (~8h) - I'm a little bit behind, I would have liked to have all the infrastructure part done, but I've only gotten the cron job ready. It should be slightly easier though, as I was still getting used to Kubernetes. Still, decent progress was made.
Tuesday (~2h) - Caught up with where I wanted to be, managed to setup and connect to Elasticsearch