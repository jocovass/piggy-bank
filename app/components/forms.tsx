import { useId } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';

export type ListOfErrors = Array<string> | null | undefined;

export function Field({
	className,
	errors,
	inputProps,
	labelProps,
}: {
	className?: string;
	errors?: ListOfErrors;
	inputProps: React.InputHTMLAttributes<HTMLInputElement>;
	labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
}) {
	const fallbackId = useId();
	const id = inputProps.id ?? fallbackId;

	return (
		<div className={className}>
			<Label htmlFor={id} {...labelProps} />
			<Input id={id} {...inputProps} />
			<div className="min-h-4 px-1 pt-1 text-xs leading-3 text-primary">
				{errors?.toString()}
			</div>
		</div>
	);
}
