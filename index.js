// index.js
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Initialise Prisma
const prisma = new PrismaClient();

// Create express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP + Socket.io server
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' } // allow all origins
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('joinPoll', (pollId) => {
    const room = `poll-${pollId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Test route
app.get('/', (req, res) => res.send('API is running ✅'));

/* ------------------- USERS CRUD ------------------- */

// Create user
app.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: password
      }
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
      return res.status(400).json({ error: 'Email already exists. Please use a different email.' });
    }
    res.status(500).json({ error: 'Something went wrong' });
  }
});


// Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    const sanitized = users.map(u => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
    res.json(sanitized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch users' });
  }
});

// Update user
app.put('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, password } = req.body;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(password && { passwordHash: password })
      }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update user' });
  }
});

// Delete user
app.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete user' });
  }
});

/* ------------------- POLLS CRUD ------------------- */

// Create poll
app.post('/polls', async (req, res) => {
  try {
    const { question, creatorId, options } = req.body;
    if (!question || !creatorId || !Array.isArray(options)) {
      return res.status(400).json({ error: 'question, creatorId, options[] are required' });
    }

    const poll = await prisma.poll.create({
      data: {
        question,
        creatorId,
        options: { create: options.map(text => ({ text })) }
      },
      include: { options: true }
    });

    res.json(poll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create poll' });
  }
});

// Get poll with vote counts
app.get('/polls/:id', async (req, res) => {
  try {
    const pollId = parseInt(req.params.id);
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: { include: { votes: true } } }
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const result = {
      ...poll,
      options: poll.options.map(opt => ({ ...opt, voteCount: opt.votes.length }))
    };
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch poll' });
  }
});

// Update poll
app.put('/polls/:id', async (req, res) => {
  try {
    const pollId = parseInt(req.params.id);
    const { question, isPublished } = req.body;
    const updated = await prisma.poll.update({
      where: { id: pollId },
      data: {
        ...(question && { question }),
        ...(isPublished !== undefined && { isPublished })
      }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update poll' });
  }
});

// Delete poll
app.delete('/polls/:id', async (req, res) => {
  try {
    const pollId = parseInt(req.params.id);
    await prisma.poll.delete({ where: { id: pollId } });
    res.json({ message: 'Poll deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete poll' });
  }
});

/* ------------------- VOTES ------------------- */

// Cast vote
app.post('/votes', async (req, res) => {
  try {
    const { userId, pollOptionId } = req.body;
    if (!userId || !pollOptionId) return res.status(400).json({ error: 'userId and pollOptionId are required' });

    // Prevent duplicate votes
    const existingVote = await prisma.vote.findUnique({
      where: { userId_pollOptionId: { userId, pollOptionId } }
    });
    if (existingVote) return res.status(400).json({ error: 'User already voted for this option' });

    // Create vote
    const vote = await prisma.vote.create({ data: { userId, pollOptionId } });

    // Fetch updated poll
    const option = await prisma.pollOption.findUnique({
      where: { id: pollOptionId },
      include: { poll: { include: { options: { include: { votes: true } } } } }
    });

    if (option && option.poll) {
      const updatedPoll = {
        ...option.poll,
        options: option.poll.options.map(opt => ({ ...opt, voteCount: opt.votes.length }))
      };
// broadcast to ALL connected clients
io.emit('pollUpdated', updatedPoll);

    }

    res.json(vote);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not cast vote' });
  }
});

// Delete vote
app.delete('/votes/:id', async (req, res) => {
  try {
    const voteId = parseInt(req.params.id);
    await prisma.vote.delete({ where: { id: voteId } });
    res.json({ message: 'Vote deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete vote' });
  }
});

/* ------------------- START SERVER ------------------- */
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
