const express = require('express')
// const bodyParser = require('body-parser')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
dotenv.config()

// simply mongodb installed
const mongodb = require('mongodb')
const mongoClient = mongodb.MongoClient
const objectID = mongodb.ObjectID

// const dbURL = 'mongodb://127.0.0.1:27017'
const dbURL = process.env.dbURL;

const app = express()
app.use(express.json())
app.use(cors())

const port = process.env.PORT || 5000
app.listen(port, () => console.log('your app is running in', port))

app.get('/', (req, res) => {
  res.send('<h1>Welcome to Customer Relationship Management BackEnd..! </h1>')
})
app.post('/customer',authenticatedUsers, (req, res) => {
  if (req.headers.type === 'Manager' && req.headers.edit === "true") {
  mongoClient.connect(dbURL, (err, client) => {
    client
      .db('CRM')
      .collection('customer')
      .insertOne(req.body, (err, data) => {
        if (err) throw err
        client.close()
        console.log('Customer Request Created successfully, Connection closed')
        res.status(200).json({
          message: 'Customer Request Created..!!'
        })
      })
  })
   } else
    res.status(200).json({
      message: 'Only Authenticated Manager can Post..!!'
    })
})

app.get('/customer', authenticatedUsers, (req, res) => {
  console.log('head', req.headers)
  mongoClient.connect(dbURL, (err, client) => {
    if (err) throw err
    let db = client.db('CRM')
    db.collection('customer')
      .find()
      .toArray()
      .then(data => {
        res.status(200).json(data)
      })
      .catch(err => {
        res.status(404).json({
          message: 'No data Found or some error happen',
          error: err
        })
      })
  })
})

app.put('/customer', authenticatedUsers, (req, res) => {
  if (req.headers.type === 'Employee' && req.headers.edit === 'true') {
    mongoClient.connect(dbURL, (err, client) => {
      if (err) throw err
      client
        .db('CRM')
        .collection('customer')
        .findOneAndUpdate(
          { _id: objectID(req.body.id) },
          { $set: { state: req.body.state } }
        )
        .then(data => {
          console.log('Customer data update successfully..!!')
          client.close()
          res.status(200).json({
            message: 'Customer data updated..!!'
          })
        })
    })
  }
})

app.post('/register', (req, res) => {
  mongoClient.connect(dbURL, (err, client) => {
    if (err) throw err
    let db = client.db('CRM')
    db.collection('users').findOne({ email: req.body.email }, (err, data) => {
      if (err) throw err
      if (data) {
        res.status(400).json({ message: 'Email already exists..!!' })
      } else {
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(req.body.password, salt, (err, cryptPassword) => {
            if (err) throw err
            req.body.password = cryptPassword
            db.collection('users').insertOne(req.body, (err, result) => {
              if (err) throw err
              client.close()
              res.status(200).json({ message: 'Registration successful..!!' })
            })
          })
        })
      }
    })
  })
})

app.post('/login', (req, res) => {
  mongoClient.connect(dbURL, (err, client) => {
    if (err) throw err
    client
      .db('CRM')
      .collection('users')
      .findOne({ email: req.body.email }, (err, data) => {
        if (err) throw err
        if (data) {
          bcrypt.compare(req.body.password, data.password, (err, validUser) => {
            if (err) throw err
            if (validUser) {
              jwt.sign(
                { userId: data._id, email: data.email },
                'uzKfyTDx4v5z6NSV',
                { expiresIn: '1h' },
                (err, token) => {
                  res.status(200).json({
                    message: 'Login success..!!',
                    token,
                    type: data.type,
                    edit: data.edit
                  })
                }
              )
            } else {
              res
                .status(403)
                .json({ message: 'Bad Credentials, Login unsuccessful..!!' })
            }
          })
        } else {
          res.status(401).json({
            message: 'Email is not registered, Kindly register..!!'
          })
        }
      })
  })
})

app.get('/users',authenticatedUsers, (req, res) => {
  if (req.headers.type === 'Admin') {
    mongoClient.connect(dbURL, (err, client) => {
      if (err) throw err
      let db = client.db('CRM')
      db.collection('users')
        .find()
        .toArray()
        .then(data => {
          res.status(200).json(data)
        })
        .catch(err => {
          res.status(404).json({
            message: 'No data Found or some error happen',
            error: err
          })
        })
    })
  }
})

app.put('/users', authenticatedUsers, (req, res) => {
  if (req.headers.type === 'Admin') {
    mongoClient.connect(dbURL, (err, client) => {
      if (err) throw err
      client
        .db('CRM')
        .collection('users')
        .findOneAndUpdate(
          { _id: objectID(req.body.id) },
          { $set: { edit: req.body.edit } }
        )
        .then(data => {
          console.log('User data update successfully..!!')
          client.close()
          res.status(200).json({
            message: 'User data updated..!!'
          })
        })
    })
  }
})

// app.get('/home', authenticatedUsers, (req, res) => {
//   res.status(200).json({ message: 'Welcome To Home Page..!!!' })
// })

function authenticatedUsers (req, res, next) {
  if (req.headers.authorization == undefined) {
    res.status(401).json({
      message: 'No token available in headers'
    })
  } else {
    jwt.verify(
      req.headers.authorization,
      'uzKfyTDx4v5z6NSV',
      (err, decodedString) => {
        if (decodedString == undefined) {
          res
            .status(401)
            .json({ message: 'Please Login To See This Page...!!!' })
        } else {
          console.log(decodedString)
          next()
        }
      }
    )
  }
}