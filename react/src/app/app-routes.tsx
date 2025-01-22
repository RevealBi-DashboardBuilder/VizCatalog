import { redirect } from 'react-router-dom';
import Builder from './builder/builder';

export const routes = [
  { index: true, loader: () => redirect('builder') },
  { path: 'builder', element: <Builder />, text: 'Builder' }
];
