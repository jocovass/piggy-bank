import { sql, getTableColumns } from 'drizzle-orm';
import {
	type PgUpdateSetSource,
	type PgTable,
	getTableConfig,
} from 'drizzle-orm/pg-core';

export function conflictUpdateSetAllColumns<TTable extends PgTable>(
	table: TTable,
	columnsToUpdate?: (keyof TTable['_']['columns'])[],
): PgUpdateSetSource<TTable> {
	const columns = getTableColumns(table);
	const { name: tableName } = getTableConfig(table);
	const conflictUpdateSet = Object.entries(columns).reduce(
		(acc, [columnName, columnInfo]) => {
			if (!columnInfo.default && columnsToUpdate?.includes(columnName)) {
				// @ts-ignore
				acc[columnName] = sql.raw(
					`COALESCE(excluded.${columnInfo.name}, ${tableName}.${columnInfo.name})`,
				);
			}
			return acc;
		},
		{},
	) as PgUpdateSetSource<TTable>;
	return conflictUpdateSet;
}
