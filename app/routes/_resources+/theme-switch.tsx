import { parseWithZod } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { z } from 'zod';
import Computer from '~/app/components/icons/computer';
import Moon from '~/app/components/icons/moon';
import Sun from '~/app/components/icons/sun';
import { Button } from '~/app/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '~/app/components/ui/tooltip';
import { useOptimisiticTheme } from '~/app/hooks/useTheme';
import { useUserPreferences } from '~/app/hooks/useUserPreferences';
import { clearTheme, setTheme, type Theme } from '~/app/utils/theme.server';
import { createToastHeader } from '~/app/utils/toast.server';

const schema = z.object({
	theme: z.enum(['system', 'light', 'dark']).optional(),
});

export async function action({ request }: ActionFunctionArgs) {
	const form = await request.formData();
	const submission = await parseWithZod(form, { schema, async: true });

	if (submission.status !== 'success') {
		return json(
			{ data: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
				headers: await createToastHeader({
					title: 'Error',
					description: 'Invalid theme',
					type: 'error',
				}),
			},
		);
	}

	const { theme } = submission.value;

	let cookieString: string | null = null;
	if (theme === 'system') {
		cookieString = await clearTheme(request);
	} else {
		cookieString = await setTheme(request, theme as Theme);
	}
	return json({}, { headers: { 'Set-Cookie': cookieString } });
}

export default function ThemeSwitch() {
	const fetcher = useFetcher();
	const optimisticTheme = useOptimisiticTheme();
	const userPreferences = useUserPreferences();
	const mode = optimisticTheme ?? userPreferences.theme ?? 'system';

	const nextMode =
		mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
	return (
		<div>
			<fetcher.Form method="POST" action="/theme-switch">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="flex h-8 w-8 items-center gap-2 rounded-full"
							>
								<span className="sr-only">Change theme to {nextMode}</span>
								{mode === 'system' ? (
									<>
										<Computer className="size-[1.125rem]" />
										<input type="hidden" name="theme" value="light" />
									</>
								) : null}

								{mode === 'light' ? (
									<>
										<Sun className="size-[1.125rem]" />
										<input type="hidden" name="theme" value="dark" />
									</>
								) : null}
								{mode === 'dark' ? (
									<>
										<Moon className="size-[1.125rem]" />
										<input type="hidden" name="theme" value="system" />
									</>
								) : null}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p className="capitalize">{mode}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</fetcher.Form>
		</div>
	);
}
