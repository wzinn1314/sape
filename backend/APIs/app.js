require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', require('./routes/auth.routes'));
app.use('/users', require('./routes/user.routes'));
app.use('/students', require('./routes/student.routes'));
app.use('/config', require('./routes/config.routes'));

module.exports = app;