import express from 'express';
import { getLatestTours,  searchTours } from './tourController';

const tourSearchRouter = express.Router();

// Define specific routes before more generic ones
tourSearchRouter.get('/latest',(req, res, next) => {
 getLatestTours(req, res, next);
});
tourSearchRouter.get('/', (req, res, next) => {
    console.log('Query all:', req.query);
 searchTours(req, res, next);
});


export default tourSearchRouter;
