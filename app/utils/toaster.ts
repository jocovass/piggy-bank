import { useEffect } from 'react';
import { toast } from 'sonner';
import { type ServerToast } from './toast.server';

export function useToast(config?: ServerToast | null) {
	useEffect(() => {
		if (config) {
			const id = setTimeout(() => {
				toast[config.type](config.title, {
					description: config.description,
					id: config.id,
				});
			}, 0);
			return () => clearTimeout(id);
		}
	}, [config]);
}
