import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as amqp from 'amqplib';

const queue = 'login';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 4000);

  // Connect to RabbitMQ
  const connection = await amqp.connect({
    port: 5673,
    hostname: '93.115.145.132',
    protocol: 'amqp',
  });
  const channel = await connection.createChannel();

  // Ensure the queue exists
  await channel.assertQueue(queue, { durable: false });
  channel.prefetch(1);
  console.log(' [x] Awaiting RPC requests');

  // Consume messages from the queue
  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      const n = parseInt(msg.content.toString(), 10);
      console.log('phone number:', n, 'processing');

      // Send the result back to the reply queue
      await delay(5);
      channel.sendToQueue(
        msg.properties.replyTo,
        Buffer.from(n.toString() + ' handled'),
        {
          correlationId: msg.properties.correlationId,
        },
      );

      // Acknowledge the message
      channel.ack(msg);
      console.log(`${msg.content.toString()} handled`);
    }
  });
}

// Delay function for demonstration (not used in current setup)
function delay(seconds: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('salam');
    }, seconds * 1000);
  });
}

bootstrap();
