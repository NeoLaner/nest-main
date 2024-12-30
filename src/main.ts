import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as amqp from 'amqplib';

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

  const queue = 'rpc_queue';

  // Ensure the queue exists
  await channel.assertQueue(queue, { durable: false });
  channel.prefetch(1);
  console.log(' [x] Awaiting RPC requests');

  // Consume messages from the queue
  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      const n = parseInt(msg.content.toString(), 10);
      console.log(' [.] fib(%d)', n);

      const result = fibonacci(n);

      // Send the result back to the reply queue
      channel.sendToQueue(
        msg.properties.replyTo,
        Buffer.from(result.toString()),
        {
          correlationId: msg.properties.correlationId,
        },
      );

      // Acknowledge the message
      channel.ack(msg);
    }
  });
}

// Fibonacci function
function fibonacci(n: number): number {
  if (n === 0 || n === 1) {
    return n;
  } else {
    return fibonacci(n - 1) + fibonacci(n - 2);
  }
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
