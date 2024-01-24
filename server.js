const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const formatMessage = require('./utils/messages')
const createAdapter = require('@socket.io/redis-adapter').createAdapter
const mysql = require('mysql')
var ejs = require('ejs')
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')

require('dotenv').config()

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users')
const { Console } = require('console')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())
//EJS Engine
app.set('view engine', 'html')
app.engine('html', ejs.renderFile)

// Set static folder
app.use(express.static(path.join(__dirname, 'public')))

const botName = 'Anon '

//create connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'eaDiscord',
  insecureAuth: true
})

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "public","index.html"))
}) 

app.post('/chatgroup', (req, res) => {
  let nickname = req.body.username;
  let gID = req.body.groupid;
  let groupname = req.body.groupname;
 
  let data = { groupID: gID, nickname: nickname }
  let sql = 'insert into Members SET ?';

  let query = db.query(sql, data, (err, result) => {
    if (!err) {
      res.redirect(`/chat.html?username=${nickname}&room=${groupname}`);
    }
    else {
      console.error(err);
    }
  }) 

}) 

app.get('/createGroupForm', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/creategroup.html'))
})

app.get('/leaveroom', (req, res) => {
  let user = req.cookies.user;
  let sql = `delete from Members where nickname = "${user}" `;
  console.log(sql);
  let query2 = db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
    }
  res.sendFile(path.join(__dirname, '/public/groups.html'))
  })
})

app.post('/welcome', (req, res) => {
  let username = req.body.username;
  res.cookie('user', username);
  let sql = `select nickname from Members where nickname = "${username}"`;
  let query2 = db.query(sql, (err, results) => {
    if (!err) {
      if(results.length>0){
        console.log(results[0].nickname);
        res.cookie('exist','1')
        console.log("Username Exist Please try another one!")
        res.redirect('/')
      }
      else{
        res.cookie('exist','0')
        res.sendFile(path.join(__dirname, '/public/groups.html'))
      }
    }
  })
  
})


app.post('/creategroup', (req, res) => {
  let creatby = req.cookies.user;
  let groupname = req.body.groupName
  let description = req.body.description;
  //console.log(creatby)
  //console.log(groupname)
  let data = { name: groupname, createdby: creatby, description:description }
  let sql = 'insert into GroupName SET ?'
  let sql2 = `select id from GroupName where name = "${groupname}"`;
 // console.log(sql2)
  let groupID;
  
  let query = db.query(sql, data, (err, result) => {
    if (err) {
      console.error(err);
    }
    res.redirect(`/chat.html?username=${creatby}&room=${groupname}`);
  })

      //Get ID of the created group
      let query2 = db.query(sql2, (err, results) => {
        if (err) {
          console.error(err);
        }
        groupID = results[0].id;
        console.log("One",groupID);
        let data3 = { groupID: groupID, nickname: creatby }
        let sql3 = "insert into Members SET ?"
        let query3 = db.query(sql3, data3, (err, result) => {
        if (err) {
          console.error(err);
        }
      })
  })
})
 // adding the creator as a member
 // console.log(groupID);

app.get('/getData', (req, res) => {
  const query = 'select *, (select count(nickname)usermember from (select distinct nickname, groupID from members)b where groupID=id) as count from GroupName';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error executing MySQL query: ', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      //console.log(results)
      res.json(results);
      
    }
  });
});


// Run when client connects
io.on('connection', socket => {
  //console.log(io.of('/').adapter)
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room)

    socket.join(user.room)

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to Anonymous-Chat!'))

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      )

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    })
  })

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id)

    io.to(user.room).emit('message', formatMessage(user.username, msg))
  })

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id)

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      )

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      })
    }
  })
})

const PORT = process.env.PORT || 3040

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
