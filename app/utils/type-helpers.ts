export type HasDate<T> = T extends Date ? T | string : T;

export type DateToDateString<T> = {
	[K in keyof T]: HasDate<T[K]>;
};
