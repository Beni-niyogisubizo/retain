import { combineReducers, legacy_createStore } from 'redux';
import { filtersReducer } from './filtersReducer';

const rootReducer = combineReducers({
  filters: filtersReducer,
});

export const store = legacy_createStore(rootReducer);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
