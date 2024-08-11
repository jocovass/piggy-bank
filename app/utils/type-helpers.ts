export type DateToDateString<T> = {
	[K in keyof T]: T[K] extends Date ? Date | string : T[K];
};
