import {
  getPostsByUserId as getPosts,
  patchPost,
  createPost,
  deletePost as delPost,
  getPostsPage as getApiPostsPage,
} from '../api/apiPosts.js';

import {
  getCommentsByPostId,
  deleteComment as delComment,
  createComment,
  patchComment,
} from '../api/apiComments.js';

export async function getPostsByUserId(userId) {
  return await getPosts(userId);
}

/* Returns the page's posts plus an explicit `hasMore` flag derived from
   json-server's `next` field. We can't rely on length-vs-PAGE_SIZE alone
   because json-server v1 clamps out-of-range pages to the last page (which
   would produce duplicates when totals divide evenly into the page size). */
export async function getPostsPage(page, perPage) {
  const response = await getApiPostsPage(page, perPage);
  if (Array.isArray(response)) return { data: response, hasMore: false };
  return {
    data: response?.data ?? [],
    hasMore: response?.next != null,
  };
}

export async function updatePost(postId, patch) {
  return await patchPost(postId, patch);
}

export async function addPost(post) {
  return await createPost(post);
}

export async function deletePost(postId) {
  return await delPost(postId);
}

export async function getComments(postId) {
  return await getCommentsByPostId(postId);
}

export async function deleteComment(commentId) {
  return await delComment(commentId);
}

export async function addComment(comment) {
  return await createComment(comment);
}

export async function updateComment(commentId, patch) {
  return await patchComment(commentId, patch);
}
