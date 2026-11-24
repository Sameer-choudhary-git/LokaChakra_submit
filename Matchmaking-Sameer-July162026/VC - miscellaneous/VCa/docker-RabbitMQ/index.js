const express = require('express');
const fs = require('fs').promises;
const app = express();
const { UserProcessingQueue } = require('./rabbit_functions/queue_management_sys');
const cors = require('cors');
const Joi = require('joi');
require('dotenv').config();
app.use(cors({ origin: process.env.RABBITMQ_API_URL }));

const API_KEY = process.env.RABBITMQ_API_KEY;
if (!API_KEY) {
    console.error("FATAL ERROR: RABBITMQ_API_KEY is not set.");
    process.exit(1);
}

const apiKeyAuth = (req, res, next) => {
    const providedApiKey = req.headers['x-api-key'];
    if (!providedApiKey || providedApiKey !== API_KEY) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    next();
};

const addUserSchema = Joi.object({
    profilePDA: Joi.string().required(),
    role: Joi.string().required(),
    cid: Joi.string().required(),
    signature: Joi.string().required(),
    userPublicKey: Joi.string().required(),
    timestamp: Joi.number().required(),
    status: Joi.string().required(),
}).strict(); 

const userQueue = new UserProcessingQueue();

app.use(express.json());
app.use(cors());

userQueue.connect().then(() => {
    userQueue.startProcessing();
});

app.get('/', (req, res) => {
    res.send('User Processing Queue API is running');
});

app.post('/api/queue/add-user', apiKeyAuth, async (req, res) => {
    try {
        const { error, value } = addUserSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, error: `Invalid input: ${error.details[0].message}` });
        }

        await userQueue.addUserToQueue(value);
        res.json({ success: true, message: 'User added to processing queue' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/queue/status', async (req, res) => {
    try {
        const status = await userQueue.getQueueStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const data = await fs.readFile(userQueue.usersFilePath, 'utf8');
        const users = JSON.parse(data);
        res.json(users);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json([]);
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

app.post('/api/getUserFile', async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ 
                success: false, 
                error: 'Role parameter is required' 
            });
        }

        let filePath;
        try {
            filePath = await userQueue.getUserFilePath(role);
        } catch (error) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid role: ${role}. Valid roles are: founder, investor, accelerator, executive, legal, government, cybersecurity, freelancer, mentor_research, exit_planner` 
            });
        }

        const data = await fs.readFile(filePath, 'utf8');
        const users = JSON.parse(data);
        
        res.json({ 
            success: true, 
            role: role,
            count: users.length,
            users: users 
        });
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json({ 
                success: true, 
                role: req.body.role,
                count: 0,
                users: [],
                message: `No users found for role: ${req.body.role}` 
            });
        } else if (error instanceof SyntaxError) {
            res.status(500).json({ 
                success: false, 
                error: 'Invalid JSON format in user file' 
            });
        } else {
            console.error('Error in getUserFile endpoint:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error while retrieving users' 
            });
        }
    }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
