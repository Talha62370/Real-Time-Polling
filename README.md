# 🗳️ Real-Time Polling App

A Node.js + Prisma + Socket.IO backend for creating polls, casting votes and seeing **live results** in real-time.

---

## 🚀 Features

- **User CRUD** – create, update, delete users.
- **Poll CRUD** – create, update, delete polls with options.
- **Vote Casting** – cast votes for poll options.
- **Live Results** – when a vote is cast, all connected clients viewing that poll get updated counts instantly (via WebSockets).
- Built with **Express**, **Prisma ORM**, **Socket.IO**.

---

## 🛠️ Tech Stack

- **Node.js / Express.js** – REST API
- **Prisma** – database ORM
- **Socket.IO** – real-time updates
- **SQLite/MySQL/PostgreSQL** – choose your DB (configure in `.env`)

---

## 📦 Installation

```bash
# clone repo
git clone <your-repo-url>
cd realtime-polling

# install dependencies
npm install

# set up your database (edit .env first)
npx prisma migrate dev --name init

# optional: open DB GUI
npx prisma studio

Running the Server
node index.js
Server starts at: http://localhost:5000

WebSocket Listener (for testing live updates)

We’ve included a listener.js script to test live broadcast events:
node listener.js
This connects to your Socket.IO server and logs broadcast events when votes are cast.

API Endpoints
👤 Users
Method	Endpoint	Body	Description
POST	/users	{ name, email, password }	Create a new user
GET	/users	–	Get all users
PUT	/users/:id	{ name, email, password }	Update user
DELETE	/users/:id	–	Delete user
📊 Polls
Method	Endpoint	Body	Description
POST	/polls	{ question, options: ["Option1","Option2"] }	Create new poll
GET	/polls	–	List all polls
GET	/polls/:id	–	Get poll + options + votes
PUT	/polls/:id	{ question }	Update poll question
DELETE	/polls/:id	–	Delete poll
🗳️ Votes
Method	Endpoint	Body	Description
POST	/polls/:pollId/vote	{ optionId }	Cast a vote for a poll option

When a vote is cast, all clients in that poll’s room get a Socket.IO event:

socket.on('pollUpdated', (updatedPoll) => {
  console.log('Updated poll results:', updatedPoll);
});

Viewing Data
To visually inspect your database, run:
npx prisma studio
Then open http://localhost:5555 in your browser.
You can view/edit all User, Poll, PollOption and Vote records here.
