import { createRequire } from 'module';
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
import { create } from 'ipfs-http-client';
import Feed from './models/FeedModel.cjs';
require('dotenv').config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Post = require('./models/PostModel.cjs');
const User = require('./models/UserModel.cjs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use('/public', express.static('public'));

async function ipfsClient() {
  const ipfs = await create(new URL(process.env.IPFS_URL));
  return ipfs;
}

// multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function (req, file, cb) {
    if (file) {
      const uniqueSuffix =
        Date.now() + '-' + uuid.v4() + path.extname(file.originalname);
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
app.post('/signin', async (req, res) => {
  try {
    const user = await User.findOne({ key: req.body.key });
    if (user) {
      res.status(200).json(user);
    } else {
      const newUser = await User.create({
        key: req.body.key,
        name: req.body.name,
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
      data = {
        ...req.body,
        profile_img: req.file.path,
        completed_profile: true,
      };
    }

    await User.findOneAndUpdate({ key: req.body.key }, data);
    const user = await User.findOne({ key: req.body.key });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error });
  }
});

// getting posts
app.get('/posts', async (req, res) => {
  const posts = await Feed.find().populate(['post', 'poster', 'owner']);

  res.status(200).json(posts);
});

//getting specific post
app.get('/post/:pid', async (req, res) => {
  const post = await Post.find({ pid: req.params.pid }).populate([
    'owner',
    'sharers',
  ]);

  if (!post.length) {
    res.status(400).send({ message: 'No Post with that post id' });
  } else {
    res.status(200).send(post);
  }
});

// creating hash of a file and metadata
app.post('/create/hash', upload.single('file'), async (req, res) => {
  try {
    let metadata;
    let hashes;
    var imagePath = __dirname + '/public/uploads/' + req.file.filename;
    new Exif({ image: imagePath }, async function (error, exifData) {
      if (error) {
        res.status(400).send({ message: 'Exif parsing issue' });
      } else {
        metadata = exifData;
        //sending ipfs and getting hash
        const file = fs.readFileSync(imagePath);
        let imageFileName = req.file.filename;
        let trimmedFileName = imageFileName.substring(
          0,
          imageFileName.length - 4
        );

        let ipfs = await ipfsClient();
        let resultImage = await ipfs.add({
          path: imageFileName,
          content: file,
        });
        console.log(resultImage);

        let ipfsHash = resultImage.cid.toString();
        metadata.ipfshash = ipfsHash;
        metadata.walletid = req.body.key;

        let resultMetadata = await ipfs.add({
          path: trimmedFileName + '.json',
          content: JSON.stringify(metadata),
        });
        console.log(resultMetadata);

        hashes = {
          metaContentHash: ipfsHash,
          metaHash: resultMetadata.cid.toString(),
        };
        // checking if post exists
        const existingPost = await Post.findOne(hashes);
        if (existingPost) {
          res.status(409).json({ message: 'Content already exists' });
        } else {
          // if post does not exist sent metadata and content hashes with path of file
          res.status(200).send({ ...hashes, path: req.file.path });
        }
      }
    });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

//creating a post
app.post('/create/post', async (req, res) => {
  try {
    const post = await Post.create({
      path: req.body.path,
      shareable: req.body.shareable,
      metaHash: req.body.metaHash,
      caption: req.body.caption,
      metaContentHash: req.body.metaContentHash,
      owner: mongoose.Types.ObjectId(req.body.user_id),
      pid: req.body.pid,
      tx: req.body.tx,
    });

    await Feed.create({
      post: mongoose.Types.ObjectId(post.id),
      isOwner: true,
      poster: mongoose.Types.ObjectId(req.body.user_id),
      owner: mongoose.Types.ObjectId(req.body.user_id),
    });

    res.status(200).send(post);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.post('/share/post', async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { pid: req.body.pid },
      { $push: { sharers: mongoose.Types.ObjectId(req.body.sharer_id) } }
    );

    await Feed.create({
      post: mongoose.Types.ObjectId(post.id),
      isOwner: false,
      poster: mongoose.Types.ObjectId(req.body.sharer_id),
      owner: mongoose.Types.ObjectId(req.body.owner_id),
    });

    await User.findByIdAndUpdate(req.body.sharer_id, {
      $push: { shared: post.id },
    });

    res.status(200).send(post);
  } catch (error) {
    console.log(error);
    res.status(400).send(error.message);
  }
});

// //creating posts
// app.post('/post', upload.single('file'), async (req, res) => {
//   try {
//     let metadata;
//     let hashes;
//     var imagePath = __dirname + '/public/uploads/' + req.file.filename;
//     new Exif({ image: imagePath }, async function (error, exifData) {
//       if (error) {
//         console.log('(try) Error: ' + error.message);
//         res.status(400).send({ message: 'Exif parsing issue' });
//       } else {
//         metadata = exifData;
//         //sending ipfs and getting hash
//         const file = fs.readFileSync(imagePath);
//         let imageFileName = req.file.filename;
//         let trimmedFileName = imageFileName.substring(
//           0,
//           imageFileName.length - 4
//         );

//         let ipfs = await ipfsClient();
//         let resultImage = await ipfs.add({
//           path: imageFileName,
//           content: file,
//         });
//         console.log(resultImage);

//         let ipfsHash = resultImage.cid.toString();
//         metadata.ipfshash = ipfsHash;
//         metadata.walletid = req.body.key;

//         let resultMetadata = await ipfs.add({
//           path: trimmedFileName + '.json',
//           content: JSON.stringify(metadata),
//         });
//         console.log(resultMetadata);

//         hashes = {
//           metaContentHash: ipfsHash,
//           metaHash: resultMetadata.cid.toString(),
//         };
//         // checking if post exists
//         const existingPost = await Post.findOne(hashes);
//         console.log(existingPost);
//         if (existingPost) {
//           res.status(409).json({ message: 'Content already exists' });
//         } else {
//           //creating file
//           const post = await Post.create({
//             path: req.file.path,
//             shareable: req.body.shareable,
//             metaHash: hashes.metaHash,
//             metaContentHash: hashes.metaContentHash,
//             owner: mongoose.Types.ObjectId(req.body.user_id),
//           });

//           res.status(200).send(post);
//         }
//       }
//     });
//   } catch (error) {
//     res.status(400).send(error.message);
//   }
// });

// liking posts
app.post('/like/post', async (req, res) => {
  try {
    const feedPost = await Feed.findByIdAndUpdate(req.body.id, {
      $inc: { likes: +1 },
    });

    if (!feedPost) throw 'Error liking post';
    await User.findByIdAndUpdate(req.body.liker_id, {
      $push: { liked: req.body.id },
    });

    const user = await User.findById(req.body.liker_id);
    res.status(200).send({ user });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// liking posts
app.post('/unlike/post', async (req, res) => {
  try {
    const feedPost = await Feed.findByIdAndUpdate(req.body.id, {
      $inc: { likes: -1 },
    });

    if (!feedPost) throw 'Error Unliking post';

    await User.findByIdAndUpdate(req.body.unliker_id, {
      $pull: { liked: req.body.id },
    });
    const user = await User.findById(req.body.unliker_id);
    res.status(200).send({ user });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.listen(process.env.PORT, () => {
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(
      () => {
        console.log('db connected');
      },
      (err) => {
        console.log('error occured will connecting to db' + err);
      }
    );

  console.log('listening on port ' + process.env.PORT);
});
