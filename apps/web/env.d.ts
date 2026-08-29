/// <reference types="vite/client" />
// 显式引入插件的类型增强：它通过 declare module 'pinia' 给 defineStore
// 的选项加上 persist 字段。不引的话该字段在类型层面不存在，vue-tsc 会报
// 「persist does not exist in type DefineSetupStoreOptions」。
/// <reference types="pinia-plugin-persistedstate" />
