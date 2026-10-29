import type { RootState } from './store';
import type { DesktopWindow } from '../features/desktop/slice';
import type { WSState } from '../shared/ws/slice';
// Compile-time assertions: fail tsc if RootState slices degrade to {} or any.
type IsAny<T> = 0 extends 1 & T ? true : false;
type Assert<T extends true> = T;
export type _desktopWindows = Assert<RootState['desktop']['windows'] extends DesktopWindow[] ? true : false>;
export type _ws = Assert<RootState['ws'] extends WSState ? true : false>;
export type _notAny = Assert<IsAny<RootState['desktop']> extends false ? true : false>;
export type _keys = Assert<
  'ws' | 'auth' | 'tickets' | 'desktop' | 'communication' | 'scores' | 'team' | 'certificates' | 'ticketsApi' extends keyof RootState ? true : false
>;
