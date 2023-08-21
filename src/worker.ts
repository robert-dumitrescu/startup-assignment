import RabbitMQService from "./services/rabbitService";

const consumer = async (message: string) => {
    console.log(message);
}

(async () => {
    const rabbitService = new RabbitMQService();
    await rabbitService.init();

    await rabbitService.receiveMessage(consumer);
})();