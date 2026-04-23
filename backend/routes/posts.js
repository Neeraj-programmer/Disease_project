const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  reactToPost,
  addComment,
  deleteComment,
  savePost,
  getSavedPosts,
  summarizePost,
  getSimilarUsers,
} = require('../controllers/postController');

// Posts CRUD
router.get('/', getPosts);
router.get('/saved', auth, getSavedPosts);
router.get('/similar-users', auth, getSimilarUsers);
router.get('/:id', getPost);
router.post('/', auth, upload.array('images', 5), createPost);
router.put('/:id', auth, upload.array('images', 5), updatePost);
router.delete('/:id', auth, deletePost);

// Reactions & comments
router.post('/:id/react', auth, reactToPost);
router.post('/:id/comments', auth, addComment);
router.delete('/:postId/comments/:commentId', auth, deleteComment);

// Bookmark & AI
router.post('/:id/save', auth, savePost);
router.post('/:id/summarize', auth, summarizePost);

module.exports = router;
