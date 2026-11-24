const amqp = require('amqplib');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('Testing RabbitMQ connection...');
        
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        console.log('✅ Successfully connected to RabbitMQ');
        
        const queueName = 'test_queue';
        await channel.assertQueue(queueName, { durable: true });
        console.log(`✅ Queue '${queueName}' created successfully`);
        
        const message = JSON.stringify({ test: 'Hello RabbitMQ!', timestamp: Date.now() });
        await channel.sendToQueue(queueName, Buffer.from(message), { persistent: true });
        console.log('✅ Test message sent successfully');
        
        const msg = await channel.get(queueName);
        if (msg) {
            console.log('✅ Test message received:', JSON.parse(msg.content.toString()));
            channel.ack(msg);
        }
        
        await channel.deleteQueue(queueName);
        await connection.close();
        
        console.log('✅ All tests passed! RabbitMQ is ready to use.');
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        console.error('Make sure RabbitMQ is running and credentials are correct');
    }
}

testConnection();