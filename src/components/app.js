const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const databasePath = path.join(__dirname, 'twitterClone.db')

const initializeDbAndStartServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndStartServer()

const convertUserDbObjectToResponseObject = dbObject => {
  return {
    userId: dbObject.user_id,
    name: dbObject.name,
    username: dbObject.username,
    password: dbObject.password,
    gender: dbObject.gender,
  }
}

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  // check if user already exists with the same username
  const selectUserQuery = `
SELECT * FROM user WHERE username = '${username}';
`
  const dbUser = await database.get(selectUserQuery)
  if (dbUser) {
    response.status(400)
    response.send('User already exists')
  } else if (password.length < 6) {
    response.status(400)
    response.send('Password is too short')
  } else {
    // Create a new user
    const hashedPassword = await bcrypt.hash(password, 10)
    const addNewUserQuery = ` INSERT INTO user (name, username, password, gender) 
       VALUES ('${name}', '${username}' , '${hashedPassword}' , '${gender}' ); `
    await database.run(addNewUserQuery)
    response.send('User created successfully')
  }
})
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  // check if the username exists
  const selectUserQuery = `
    SELECT * FROM user WHERE username = '${username}';
    `
  const dbUser = await database.get(selectUserQuery)
  if (!dbUser) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (!isPasswordMatched) {
      response.status(400)
      response.send('Invalid password')
    } else {
      const payload = {username}
      const jwtToken = jwt.sign(payload, 'MY_SECRET_KEY')
      response.send({jwtToken})
    }
  }
})

// Authentication Middleware
const authenticateUser = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (!authHeader) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwtToken = authHeader.split(' ')[1]
    jwt.verify(jwtToken, 'MY_SECRET_KEY', (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}
