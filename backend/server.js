//for communicating with our DB
const mongoose = require('mongoose');

//for running our server
const express = require('express');

//for running our server specificallylocally
var cors = require('cors');

//to make our requests more human readable
const bodyParser = require('body-parser');

//to make our logs more human readable
const logger = require('morgan');

//our defined data structure for our application
const Data = require('./data');

//to access files from the file system
const fs = require('fs');

//to generate our public and private key for each user
const NodeRSA = require('node-rsa');

//this is the backend portion of our application
//which handles all actions and requests sent to 
//it by the front end. It's also the only part
//which communicates with our mongodb application
//we've set up

var mongopassword = "";


//password required to access our database read from a local
//file for security reasons
try {
  mongopassword = fs.readFileSync('mongo_password.txt', 'UTF-8');
} catch(err){
  console.log(err);
}

//server set up
const API_PORT = 3001;
const app = express();
app.use(cors());
const router = express.Router();

//db connection set up
const dbRoute = 'mongodb+srv://admin:'+mongopassword+'@cluster0-2m7nf.mongodb.net/test?retryWrites=true&w=majority'

mongoose.connect(dbRoute, {useNewUrlParser: true, useUnifiedTopology: true });

let db = mongoose.connection;

db.once('open', () => console.log('connected to the database'));

db.on('error', console.error.bind(console, 'MongoDB connection erro:'));

//response parser and logger set up
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(logger('dev'));

//register request handler
router.post('/register', async (req, res) => {
  //new empty data set to be added
  //to the database
  let data = new Data();

  //empty group of trusted users
  const group = [];

  //user name and password of user
  //passed through the request
  const {user, password} = req.body;

  //check to see if username and password are valid
  //if it fails we return a response with an error
  if (!user || !password) {
    return res.json({
      success: false,
      error: 'invalid inputs',
    });
  }

  //check to see if the username is unique or not
  const isDuplicate = await Data.exists({user: user});

  //given that it is unique...
  if (!isDuplicate) {
    //generate a full RSA key using the NodeRSA module
    const key = new NodeRSA({b: 2048});

    //split the full key into its public and private parts
    //which are saved as Binary Buffers
    const private_key=key.exportKey('pkcs1-der');
    const public_key=key.exportKey('pkcs8-public-der');

    //add all the necessary components to our 
    //predifined data structure
    data.public_key=public_key;
    data.private_key=private_key;
    data.user = user;
    data.password = password;
    data.group = group;

    //save the data to our database
    data.save((err) => {
      if (err) return res.json({success: false, error: err});
      return res.json({success: true});
    });
  }
  //if it's not unique we return a response to the
  //front end with an error
  else {
    return res.json({
      success: false,
      error: 'username already in use',
    });
  }
});

//login request handler
router.get('/login', (req, res) => {
  //username and password passed in
  //throught the query params in the request
  const {user, password} = req.query;

  //if the username or password are invalid
  //an error response is sent to the front end
  if (!user || !password) {
    return res.json({
      success: false,
      error: 'invalid inputs',
    });
  }

  //we look for the passed in username and password combination
  //on success we only return their trusted group to the application
  //and no other sensitive information that may be stored in the db
  //on failure we return an error message to the front end
  Data.findOne({user: user, password: password}, 'group -_id', (err, data) => {
    if (err) return res.json({success: false, error: err});
    if (data==null){
      return res.json({success: false, error: "invalid username or password"});
    }
    else {
      return res.json({success: true, data: data.group});
    }
  });
});

//getUsers request handler
router.get('/getUsers', (req, res) => {
  //we simply return ONLY all the usernames
  //present in our database
  Data.find({}, 'user -_id', (err, data) => {
    if (err) return res.json({success: false, error: err});
    return res.json({success: true, data: data});
  });
});

//updateGroup request handler
router.post('/updateGroup', (req, res) => {
  //we get the user whose group must be updated
  //and the updated group from our request
  const {user, update} = req.body;

  //we simply search for that user in the database
  //and update the group key with the new group
  Data.updateOne({user: user}, {group: update}, (err) => {
    if (err) return res.json({success: false, error: err});
    return res.json({success: true});
  });
});

//encrypt request handler
router.get('/encrypt', (req, res) => {
  //we get the user that we want to send the message to
  //and the message that we want to send from the request
  const {user, message} = req.query;

  //make sure the user and the message are valid inputs
  //otherwise we send an error response to the front 
  //end application
  if (!message || !user) {
    return res.json({
      success: false,
      error: 'invalid inputs',
    });
  }

  //we look for the user in our database and 
  //ONLY acquire their publick key which we require 
  //for our encryption and no other information
  Data.findOne({user: user}, 'public_key -_id', (err, data) => {
    if (err) return res.json({success: false, error: err});
    if (data==null){
      return res.json({success: false, error: "invalid username or password"});
    }
    else {
      //we then encrypt our message with the user's 
      //public key (in this case the "user" is who we are 
      //sending our message to and not the logged in user)
      const key = new NodeRSA();
      key.importKey(data.public_key,'pkcs8-public-der');
      var encryptedMessage=key.encrypt(message, 'base64');

      //only the encrypted message is returned to the front
      //end app and no other sensitive information
      return res.json({success: true, message: encryptedMessage});
    }
  });
});

//decrypt request handler
router.get('/decrypt', (req, res) => {
  //we get the currently logged in user
  //and the message to be decrypted
  //from the request
  const {user, message} = req.query;

  //we ensure the messsage is valid
  //otherwise we send an error response
  //to the front end
  if (!message) {
    return res.json({
      success: false,
      error: 'invalid inputs',
    });
  }

  //we look for the user in our database
  //and acquire ONLY their private key which we need
  //for decryption and no other information
  Data.findOne({user: user}, 'private_key -_id', (err, data) => {
    if (err) return res.json({success: false, error: err});
    if (data==null){
      return res.json({success: false, error: "invalid username or password"});
    }
    else {
      //we then decrypt our message with the user's 
      //private key (in this case the "user" is the 
      //logged in user)
      const key = new NodeRSA();
      key.importKey(data.private_key,"pkcs1-der");
      var decryptedMessage=key.decrypt(message);

      //only the decrypted message is returned to the front
      //end app and no other sensitive information
      return res.json({success: true, message: decryptedMessage});
    }
  });
});

app.use('/api', router);

app.listen(API_PORT, () => console.log(`listening on port ${API_PORT}`));