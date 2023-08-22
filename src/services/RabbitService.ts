import amqplib from "amqplib";

class RabbitMQService {
    queue : string = "tasks";
    conn!: amqplib.Connection;
    channel!: amqplib.Channel;

    async init() {
        if (!process.env.RABBITMQ_USER || !process.env.RABBITMQ_PASS) {
            throw new Error("Missing RabbitMQ credentials");
        }

        this.conn = await amqplib.connect(`amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@${process.env.RABBITMQ_HOST || 'localhost'}`);
        this.channel = await this.conn.createChannel();

        await this.channel.assertQueue(this.queue, {
            durable: true,
        });
    }

    async close() {
        if (!this.channel) {
            return;
        }

        return this.channel.close();
    }

    async sendMessage(message: string) {
        if (!this.channel) {
            throw new Error("RabbitMQ not initialised");
        }

        if (!message) {
            return false;
        }

        const success = this.channel.sendToQueue(this.queue, Buffer.from(message));
        if (!success) {
            throw new Error("Failed to send message");
        }
    }

    setPrefetchSize(size: number) {
        this.channel.prefetch(size);
    }

    async receiveMessage(consumer: Function) {
        return this.channel.consume(this.queue, async (message) => {
            if (!message) {
                return;
            }

            try {
                await consumer(message.content.toString());
                this.channel.ack(message);
            } catch {
                //right now the message will just be discarded, but in a production environment we should set up a dead letter exchange / queue to better monitor fails
                this.channel.reject(message, false);
            }
        }, {
            noAck: false,
        });
    }
}

export default RabbitMQService;