import { Attribution } from 'ox/erc8021';

export const BUILDER_CODE = process.env.BASE_BUILDER_CODE || 'bc_4drs46m4';
export const BASE_DATA_SUFFIX = Attribution.toDataSuffix({ codes: [BUILDER_CODE] });
