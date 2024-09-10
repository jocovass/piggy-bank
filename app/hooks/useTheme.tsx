import { useNavigation } from '@remix-run/react';
import { useHints } from '~/app/utils/client-hints';
import { type Theme } from '~/app/utils/theme.server';
import { useUserPreferences } from './useUserPreferences';

export const useOptimisiticTheme = () => {
	const navigation = useNavigation();
	const isPending = navigation.state !== 'idle';
	return navigation.formAction === '/' &&
		navigation.formMethod === 'POST' &&
		isPending
		? (navigation.formData?.get('theme') as Theme | 'system')
		: null;
};

export const useTheme = () => {
	const hints = useHints();
	const userPreferences = useUserPreferences();
	const optimisticTheme = useOptimisiticTheme();

	return optimisticTheme === 'system'
		? hints.theme
		: optimisticTheme ?? userPreferences.theme ?? hints.theme;
};
