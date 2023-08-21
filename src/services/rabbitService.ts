import amqplib from "amqplib";

class RabbitMQService {
    queue : string = "tasks";
    conn!: amqplib.Connection;
    channel!: amqplib.Channel;

    async init() {
        if (!process.env.RABBITMQ_USER || !process.env.RABBITMQ_PASS) {
            throw new Error("Missing RabbitMQ credentials");
        }

        this.conn = await amqplib.connect(`amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@localhost`);
        this.channel = await this.conn.createChannel();
    }

    async close() {
        if (!this.channel) {
            return;
        }

        return this.channel.close();
    }

    async sendMessage(message: string) : Promise<boolean> {
        if (!this.channel) {
            throw new Error("RabbitMQ not initialised");
        }

        if (!message) {
            return false;
        }

        return this.channel.sendToQueue(this.queue, Buffer.from(message));
    }
}

export default RabbitMQService;