import { Request, Response } from 'express';
import Booking from '../models/Booking';
import Course from '../models/Course';
import Equipment from '../models/Equipment';
import { Op } from 'sequelize';
import { sendError } from '../utils/sendError';

export const getAllBookings = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    
    let whereClause: any = {};
    
    // Regular users can only see their own bookings
    // Admins can see all bookings
    if (req.user.role !== 'admin') {
      whereClause.userId = userId;
    }

    const bookings = await Booking.findAll({
      where: whereClause,
      include: [
        { model: Course },
        { model: Equipment },
      ],
      order: [['date', 'DESC']],
    });

    res.json(bookings);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByPk(id, {
      include: [
        { model: Course },
        { model: Equipment },
      ],
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const createBooking = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { courseId, equipmentId, date, time, endTime, rentalType, files, location, notes } =
      req.body;

    // Запись на курс живёт в course_enrollments: там одна запись на человека
    // и счёт мест. Через брони её больше не создать — иначе оба ограничения обходятся.
    if (courseId) {
      return res.status(400).json({
        error: 'Запись на курс оформляется через POST /api/courses/:id/enroll',
      });
    }

    if (!equipmentId) {
      return res.status(400).json({ error: 'Equipment must be specified' });
    }

    const booking = await Booking.create({
      userId,
      equipmentId,
      date,
      time,
      endTime,
      rentalType: rentalType || 'remote',
      files: files || [],
      location,
      notes,
      status: 'pending',
    });

    const bookingWithDetails = await Booking.findByPk(booking.id, {
      include: [
        { model: Course },
        { model: Equipment },
      ],
    });

    res.status(201).json(bookingWithDetails);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const updateBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await booking.update(req.body);
    
    const updatedBooking = await Booking.findByPk(id, {
      include: [
        { model: Course },
        { model: Equipment },
      ],
    });

    res.json(updatedBooking);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const deleteBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await booking.destroy();
    res.json({ message: 'Booking deleted successfully' });
  } catch (error: any) {
    sendError(res, error);
  }
};
