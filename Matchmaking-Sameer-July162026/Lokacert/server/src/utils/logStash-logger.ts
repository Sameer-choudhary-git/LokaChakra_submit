import winston from 'winston';
import net from 'net';
import Transport from 'winston-transport';

// 1. Define a robust Custom Transport (Uses native Node.js networking)
class CustomLogstashTransport extends Transport {
  host: string;
  port: number;
  client: net.Socket | null = null;
  reconnectTimeout: NodeJS.Timeout | null = null;
  isConnecting: boolean = false;
  maxReconnectAttempts: number = 5;
  reconnectAttempts: number = 0;

  constructor(opts: any) {
    super(opts);
    this.host = opts.host;
    this.port = opts.port;
    this.connect();
  }

  connect() {
    if (this.isConnecting || (this.client && !this.client.destroyed)) {
      return; // Prevent multiple connection attempts
    }

    this.isConnecting = true;
    this.client = new net.Socket();
    
    this.client.setKeepAlive(true, 10000);

    this.client.connect(this.port, this.host, () => {
      console.log(`✅ Logger connected to Logstash at ${this.host}:${this.port}`);
      this.isConnecting = false;
      this.reconnectAttempts = 0; // Reset counter on successful connection
    });

    this.client.on('error', (err) => {
      console.error(`❌ Logstash Connection Error: ${err.message}`);
      this.isConnecting = false;
      this.scheduleReconnect();
    });

    this.client.on('close', () => {
      this.client = null;
      this.isConnecting = false;
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(`🔄 Retrying Logstash connection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.reconnectTimeout = setTimeout(() => this.connect(), delay);
    } else {
      console.warn('⚠️ Max Logstash reconnection attempts reached. Logging will continue to console only.');
    }
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    if (this.client && !this.client.destroyed) {
      // Logstash json_lines codec expects a newline at the end
      const logEntry = JSON.stringify(info) + '\n';

      this.client.write(logEntry, (err) => {
        if (err) {
             console.error("Failed to write to Logstash socket:", err);
             // Optionally trigger reconnect here if write fails
        }
      });
    }
    
    callback();
  }
}

// 2. Create the Logger
const logger = winston.createLogger({
  level: 'info',
  // Format the log to include timestamp and handle Errors correctly
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }), // Crucial for seeing stack traces!
    winston.format.json()
  ),
  defaultMeta: { service: 'express-api' },
  exceptionHandlers: [
    new winston.transports.Console(), // Print crash to console
    new CustomLogstashTransport({ host: '127.0.0.1', port: 5000 }) // Send crash to Kibana
  ],
  transports: [
    // Console output for VS Code
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    
    // Our new Robust Logstash Transport
    new CustomLogstashTransport({
      host: '127.0.0.1', // Ensure this is 127.0.0.1
      port: 5000
    })
  ],
});

export default logger;
