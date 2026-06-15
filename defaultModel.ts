import type { ModelOptions } from './types';

export const getRandomDefaultModel = (): ModelOptions => {
    return { name: 'Your Photo', image: null };
};