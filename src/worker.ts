import RabbitMQService from "./services/RabbitService";

const consumer = async (message: string) => {
    console.log(message);
}

(async () => {
    const rabbitService = new RabbitMQService();
    await rabbitService.init();

    await rabbitService.receiveMessage(consumer);
})();