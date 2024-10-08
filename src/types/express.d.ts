import { Breadcrumb } from '../middlewares/breadcrumbsMiddleware';


declare global {
  namespace Express {
    interface Request {
      breadcrumbs?: Breadcrumb[];
    }
  }
}
