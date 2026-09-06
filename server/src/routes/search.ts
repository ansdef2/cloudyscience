import { Router } from 'express';
import { search, getPopularSearches } from '../controllers/searchController';

const router = Router();

router.get('/', search);
router.get('/popular', getPopularSearches);

export default router;
