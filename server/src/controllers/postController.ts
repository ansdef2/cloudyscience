import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Post from '../models/Post';
import User from '../models/User';
import { sendError } from '../utils/sendError';

const AUTHOR_ATTRIBUTES = ['id', 'name', 'avatar'];

export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const { search, sort, featured } = req.query;

    const whereClause: any = {};
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { text: { [Op.iLike]: `%${search}%` } },
      ];
    }
    // featured=true — только карусель «Актуальное», false — только основная лента
    if (featured === 'true' || featured === 'false') {
      whereClause.isFeatured = featured === 'true';
    }

    // Чип «По популярности» в ленте против сортировки по свежести
    const order: any =
      sort === 'popular' ? [['likes', 'DESC']] : [['publishedAt', 'DESC']];

    const posts = await Post.findAll({
      where: whereClause,
      include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRIBUTES }],
      order,
    });

    res.json(posts);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const getPostById = async (req: Request, res: Response) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRIBUTES }],
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const likePost = async (req: Request, res: Response) => {
  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await post.increment('likes');
    await post.reload();

    res.json({ id: post.id, likes: post.likes });
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Поля поста, которые задаёт администратор; автор, лайки — не из запроса */
const postFields = (body: any) => {
  const fields: Record<string, unknown> = {};
  if (typeof body?.title === 'string') fields.title = body.title.trim();
  if (typeof body?.text === 'string') fields.text = body.text.trim();
  if (body?.image === null || typeof body?.image === 'string') fields.image = body.image || null;
  if (typeof body?.isFeatured === 'boolean') fields.isFeatured = body.isFeatured;
  if (typeof body?.publishedAt === 'string' && !Number.isNaN(Date.parse(body.publishedAt))) {
    fields.publishedAt = new Date(body.publishedAt);
  }
  return fields;
};

export const createPost = async (req: any, res: Response) => {
  try {
    const fields = postFields(req.body);
    if (!fields.title || !fields.text) return res.status(400).json({ error: 'Нужны заголовок и текст' });

    const post = await Post.create({ publishedAt: new Date(), ...fields, authorId: req.user.id });
    const created = await Post.findByPk(post.id, {
      include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRIBUTES }],
    });
    res.status(201).json(created);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const updatePost = async (req: any, res: Response) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const fields = postFields(req.body);
    if (fields.title === '' || fields.text === '') return res.status(400).json({ error: 'Нужны заголовок и текст' });

    await post.update(fields);
    res.json(
      await Post.findByPk(post.id, { include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRIBUTES }] })
    );
  } catch (error: any) {
    sendError(res, error);
  }
};

export const deletePost = async (req: any, res: Response) => {
  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Автор удаляет свой пост, админ — любой
    if (post.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not allowed' });
    }

    await post.destroy();
    res.json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    sendError(res, error);
  }
};
