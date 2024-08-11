import { type Account, type BankConnection } from '~/db/schema';

export type BankConnectionsProps = {
	accounts: (Account & {
		bankConnection: Pick<
			BankConnection,
			'id' | 'logo' | 'name' | 'primary_color'
		>;
	})[];
};

export default function BankConnections(props: BankConnectionsProps) {
	return (
		<div>
			<h1>Unknown Route</h1>
		</div>
	);
}
