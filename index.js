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
import { create, urlSource } from 'ipfs-http-client';
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
  const ipfs = await create(new URL('http://127.0.0.1:5001'));
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
  const posts = await Post.find(null, null, {
    sort: { created_at: -1 },
  }).populate('owner');

  res.status(200).json(posts);
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
      metaContentHash: req.body.metaContentHash,
      owner: mongoose.Types.ObjectId(req.body.user_id),
    });
    res.status(200).send(post);
  } catch (error) {
    res.status(400).send(error);
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
app.post('/like/:id', async (req, res) => {
  const post = await Post.findById(req.query.id);
  const updatedPost = await Post.findByIdAndUpdate(req.query.id, {
    likes: post.likes + 1,
  });

  res.status(200).send(updatedPost);
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
