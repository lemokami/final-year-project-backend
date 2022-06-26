const cors = require('cors');
const Exif = require('exif').ExifImage;
const express = require('express');
const { default: mongoose } = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const Post = require('./models/PostModel');
const User = require('./models/UserModel');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: false }));

express.static('public');

// multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function (req, file, cb) {
    if (file) {
      const uniqueSuffix = Date.now() + '-' + uuid.v4();

      cb(null, file.fieldname + '-' + uniqueSuffix);
    } else {
      cb(new Error('no file given'));
    }
  },
});

const upload = multer({ storage: storage });

// user signin
app.get('/signin', async (req, res) => {
  try {
    const user = await User.find({ key: req.body.key });

    if (user) {
      res.status(200).json(user);
    } else {
      const newUser = User.create({ key: req.body.key });
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
app.post('/post', upload.single('file'), async (req, res) => {
  try {
    let metadata;
    new ExifImage({ image: 'myImage.jpg' }, function (error, exifData) {
      if (error) console.log('Error: ' + error.message);
      else metadata = exifData;
    });
    // TODO: send to ipfs and get hash
    // TODO: create a smartcontract from the hash
    //TODO: create the post
  } catch (error) {
    console.log('Error: ' + error.message);
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
  mongoose.connect(process.env.MONGO_URI).then(
    () => {console.log("db connected")},
    err => {console.log("error occured will connecting to db" + err)}
  );
  
  console.log('listening on port ' + process.env.PORT);
});