import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, useStore } from "react-redux";
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from "redux-persist";
import { almacenamientoCifrado } from "./almacenamientoCifrado";
import { claseSlice } from "./claseSlice";

const raiz = combineReducers({ clase: claseSlice.reducer });

export function crearStore() {
  const store = configureStore({
    reducer: persistReducer({ key: "ens", version: 1, storage: almacenamientoCifrado }, raiz),
    middleware: (getDefault) =>
      getDefault({
        // Las acciones internas de redux-persist llevan funciones.
        serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
      }),
  });
  return { store, persistor: persistStore(store) };
}

export type AppStore = ReturnType<typeof crearStore>["store"];
export type RootState = ReturnType<typeof raiz>;
export type AppDispatch = AppStore["dispatch"];

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
