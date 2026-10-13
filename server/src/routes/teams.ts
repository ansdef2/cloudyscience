import { Router } from 'express';
import {
  getMyTeams,
  createTeam,
  getTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
  getMyInvitations,
  getTeamInvitations,
  respondInvitation,
  cancelInvitation,
  removeMember,
  getTeamMessages,
  postTeamMessage,
  getTeamBookings,
} from '../controllers/teamController';
import { authenticate, requireParentConsent } from '../middleware/auth';
import { messageLimiter } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);

router.get('/', getMyTeams);
router.get('/invitations', getMyInvitations);
router.post('/invitations/:invitationId/:action(accept|decline)', requireParentConsent, respondInvitation);
router.post('/', requireParentConsent, createTeam);
router.get('/:id', getTeam);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);
// Прежний адрес «добавить участника» теперь тоже создаёт приглашение
router.post('/:id/members', requireParentConsent, inviteMember);
router.post('/:id/invitations', requireParentConsent, inviteMember);
router.get('/:id/invitations', getTeamInvitations);
router.delete('/:id/invitations/:invitationId', cancelInvitation);
router.delete('/:id/members/:userId', removeMember);
router.get('/:id/messages', getTeamMessages);
router.post('/:id/messages', requireParentConsent, messageLimiter, postTeamMessage);
router.get('/:id/bookings', getTeamBookings);

export default router;
