import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Register jest-dom matchers at runtime. Types come from ./jest-dom.d.ts:
// '@testing-library/jest-dom/vitest' redeclares vitest's Assertion with
// different type parameters, which no longer compiles against vitest 5.
expect.extend(matchers);
