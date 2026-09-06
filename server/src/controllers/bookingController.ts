import { Request, Response } from 'express';
import Booking from '../models/Booking';
import Course from '../models/Course';
import Equipment from '../models/Equipment';
import { Op } from 'sequelize';

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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
};

export const createBooking = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { courseId, equipmentId, date, time, endTime, rentalType, files, location, notes } =
      req.body;

    // Validate that either courseId or equipmentId is provided
    if (!courseId && !equipmentId) {
      return res.status(400).json({ error: 'Course or equipment must be specified' });
    }

    // If booking a course, check availability
    if (courseId) {
      const course = await Course.findByPk(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      if (course.availableSpots <= 0) {
        return res.status(400).json({ error: 'No available spots' });
      }
    }

    const booking = await Booking.create({
      userId,
      courseId,
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

    // Decrease available spots if booking a course
    if (courseId) {
      const course = await Course.findByPk(courseId);
      if (course) {
        await course.update({ availableSpots: course.availableSpots - 1 });
      }
    }

    const bookingWithDetails = await Booking.findByPk(booking.id, {
      include: [
        { model: Course },
        { model: Equipment },
      ],
    });

    res.status(201).json(bookingWithDetails);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
};

export const deleteBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Increase available spots if cancelling a course booking
    if (booking.courseId) {
      const course = await Course.findByPk(booking.courseId);
      if (course) {
        await course.update({ availableSpots: course.availableSpots + 1 });
      }
    }

    await booking.destroy();
    res.json({ message: 'Booking deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
