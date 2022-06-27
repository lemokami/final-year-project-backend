import { createRequire } from "module";
const require = createRequire(import.meta.url);

const cors = require('cors');
const Exif = require('exif').ExifImage;
const express = require('express');
const { default: mongoose } = require('mongoose');
const multer = require('multer');
const uuid = require('uuid');
const path = require('path');
const fs = require('fs');
import { fileURLToPath } from 'url';
import { create, urlSource } from 'ipfs-http-client';
require('dotenv').config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Post = require('./models/PostModel.cjs');
const User = require('./models/UserModel.cjs');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: false }));

express.static('public');

async function ipfsClient() {
  const ipfs = await create(new URL('http://127.0.0.1:5001'))
  return ipfs;
}

// multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function (req, file, cb) {
    if (file) {
      const uniqueSuffix = Date.now() + '-' + uuid.v4() + path.extname(file.originalname);
      // const uniqueSuffix = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix);
      // cb(null, "myImage" + uniqueSuffix);
    } else {
      cb(new Error('no file given'));
    }
  },
});

const upload = multer({ storage: storage });

// user signin
app.get('/signin', async (req, res) => {
  try {
    var user = await User.find({ key: req.body.key });
    if (Object.entries(user).length != 0) {
      console.log("User exists");
      res.status(200).json(user);
    } else {
      var newUser = User.create({ 
        key: req.body.key,
        name: req.body.name
      });
      res.status(200).json(newUser);
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

//update user profile
app.patch('/user', upload.single('profile_img'), async (req, res) => {
  try {
    let data = { ...req.body, completed_profile: true };
    if (req.file) {
      data = { ...req.body, completed_profile: true, file: req.file };
    }

    const user = await User.updateOne({ key: req.body.key });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error });
  }
});

// getting posts
app.get('/posts', async (req, res) => {
  const posts = await Post.find(null, null, { sort: { created_at: 1 } });

  res.status(200).json(posts);
});

//creating posts
app.post('/post', upload.single('file'), (req, res) => {
  try {
    let metadata;
    var imagePath = __dirname + '/public/uploads/' + req.file.filename;
    new Exif({ image: imagePath }, async function (error, exifData) {
      if (error) {
        console.log('(try) Error: ' + error.message);
        res.sendStatus(400);
      }
      else {
        //sending ipfs and getting hash
        metadata = exifData;
        const file = fs.readFileSync(imagePath);
        let imageFileName = req.file.filename;
        let trimmedFileName = imageFileName.substring(0, imageFileName.length - 4);

        let ipfs = await ipfsClient();
        let resultImage = await ipfs.add({
          path: imageFileName,
          content: file
        });
        console.log(resultImage);

        let ipfsHash = resultImage.cid.toString();
        metadata.ipfshash = ipfsHash;
        metadata.walletid = req.body.key;

        let resultMetadata = await ipfs.add({
          path: trimmedFileName + ".json",
          content: JSON.stringify(metadata)
        });
        console.log(resultMetadata);

        var result = {
          "ipfsImageHash": ipfsHash,
          "ipfsMetaDataHash": resultMetadata.cid.toString() 
        };

        res.status(200).json(result);
      }
    });
    // TODO: send to ipfs and get hash
    // TODO: create a smartcontract from the hash
    // TODO: create the post

    // res.sendStatus(200);
  } catch (error) {
    console.log('(catch) Error: ' + error.message);
    res.sendStatus(400);
  }
});

// liking posts
app.post('/like/:id', async (req, res) => {
  const post = await Post.findById(req.query.id);
  const updatedPost = await Post.findByIdAndUpdate(req.query.id, {
    likes: post.likes + 1,
  });

  res.status(200).send(updatedPost);
});

app.listen(process.env.PORT, () => {
  mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true}).then(
    () => {console.log("db connected")},
    err => {console.log("error occured will connecting to db" + err)}
  );
  
  console.log('listening on port ' + process.env.PORT);
});