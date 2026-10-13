import { Router } from 'express';
import {
  getMyTeams,
  createTeam,
  getTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  getTeamMessages,
  postTeamMessage,
  getTeamBookings,
} from '../controllers/teamController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMyTeams);
router.post('/', createTeam);
router.get('/:id', getTeam);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);
router.get('/:id/messages', getTeamMessages);
router.post('/:id/messages', postTeamMessage);
router.get('/:id/bookings', getTeamBookings);

export default router;
