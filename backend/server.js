const mongoose = require('mongoose');
const express = require('express');
var cors = require('cors');
const bodyParser = require('body-parser');
const logger = require('morgan');
const Data = require('./data');
const fs = require('fs');
const NodeRSA = require('node-rsa');

var mongopassword = "";

try {
  mongopassword = fs.readFileSync('mongo_password.txt', 'UTF-8');
} catch(err){
  console.log(err);
}

const API_PORT = 3001;
const app = express();
app.use(cors());
const router = express.Router();

const dbRoute = 'mongodb+srv://admin:'+mongopassword+'@cluster0-2m7nf.mongodb.net/test?retryWrites=true&w=majority'

mongoose.connect(dbRoute, {useNewUrlParser: true, useUnifiedTopology: true });

let db = mongoose.connection;

db.once('open', () => console.log('connected to the database'));

db.on('error', console.error.bind(console, 'MongoDB connection erro:'));

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(logger('dev'));

router.post('/register', async (req, res) => {
  let data = new Data();

  const group = [];
  const {user, password} = req.body;

  if (!user || !password) {
    return res.json({
      success: false,
      error: 'invalid inputs',
    });
  }

  const isDuplicate = await Data.exists({user: user});

  if (!isDuplicate) {
    const key = new NodeRSA({b: 2048});

    const private_key=key.exportKey('pkcs1-der');
    const public_key=key.exportKey('pkcs8-public-der');

    
    data.public_key=public_key;
    data.private_key=private_key;
    data.user = user;
    data.password = password;
    data.group = group;
    data.save((err) => {
      if (err) return res.json({success: false, error: err});
      return res.json({success: true});
    });
  }
  else {
    return res.json({
      success: false,
      error: 'username already in use',
    });
  }
});

router.get('/login', (req, res) => {
  const {user, password} = req.query;

  if (!user || !password) {
    return res.json({
      success: false,
      error: 'invalid inputs',
    });
  }

  Data.findOne({user: user, password: password}, (err, data) => {
    if (err) return res.json({success: false, error: err});
    if (data==null){
      return res.json({success: false, error: "invalid username or password"});
    }
    else {
      return res.json({success: true, data: data});
    }
  });
});

router.get('/getUsers', (req, res) => {
  Data.find({}, 'user -_id', (err, data) => {
    if (err) return res.json({success: false, error: err});
    return res.json({success: true, data: data});
  });
});

router.post('/updateGroup', (req, res) => {
  const {user, update} = req.body;
  Data.updateOne({user: user}, {group: update}, (err) => {
    if (err) return res.json({success: false, error: err});
    return res.json({success: true});
  });
});

router.get('/encrypt', (req, res) => {
  const {user, message} = req.query;

  if (!message || !user) {
    return res.json({
      success: false,
      error: 'invalid inputs',
    });
  }

  Data.findOne({user: user}, 'public_key -_id', (err, data) => {
    if (err) return res.json({success: false, error: err});
    if (data==null){
      return res.json({success: false, error: "invalid username or password"});
    }
    else {
      const key = new NodeRSA();
      key.importKey(data.public_key,'pkcs8-public-der');
      var encryptedMessage=key.encrypt(message, 'base64');
      return res.json({success: true, message: encryptedMessage});
    }
  });
});

router.get('/decrypt', (req, res) => {
  const {user, message} = req.query;

  if (!message) {
    return res.json({
      success: false,
      error: 'invalid inputs',
    });
  }

  Data.findOne({user: user}, 'private_key -_id', (err, data) => {
    if (err) return res.json({success: false, error: err});
    if (data==null){
      return res.json({success: false, error: "invalid username or password"});
    }
    else {
      const key = new NodeRSA();
      key.importKey(data.private_key,"pkcs1-der");
      var decryptedMessage=key.decrypt(message);
      return res.json({success: true, message: decryptedMessage});
    }
  });
});

app.use('/api', router);

app.listen(API_PORT, () => console.log(`listening on port ${API_PORT}`));