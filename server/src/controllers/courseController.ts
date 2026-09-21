import { Request, Response } from 'express';
import Course from '../models/Course';
import Institution from '../models/Institution';
import { Op } from 'sequelize';
import { sendError } from '../utils/sendError';

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const { search, institutionId } = req.query;
    
    let whereClause: any = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { title: { [Op.iLike]: `%${search}%` } },
          { direction: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }
    if (institutionId) {
      whereClause.institutionId = institutionId;
    }

    const courses = await Course.findAll({
      where: whereClause,
      include: [Institution],
      order: [['createdAt', 'DESC']],
    });

    res.json(courses);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id, {
      include: [Institution],
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const course = await Course.create(req.body);
    const courseWithInstitution = await Course.findByPk(course.id, {
      include: [Institution],
    });
    res.status(201).json(courseWithInstitution);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await course.update(req.body);
    const updatedCourse = await Course.findByPk(id, {
      include: [Institution],
    });
    res.json(updatedCourse);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await course.destroy();
    res.json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    sendError(res, error);
  }
};
