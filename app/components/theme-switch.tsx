import { Form } from '@remix-run/react';
import { useOptimisiticTheme } from '~/app/hooks/useTheme';
import { useUserPreferences } from '~/app/hooks/useUserPreferences';
import Computer from './icons/computer';
import Moon from './icons/moon';
import Sun from './icons/sun';
import { Button } from './ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip';

export default function ThemeSwitch() {
	const optimisticTheme = useOptimisiticTheme();
	const userPreferences = useUserPreferences();
	const mode = optimisticTheme ?? userPreferences.theme ?? 'system';

	const nextMode =
		mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
	return (
		<div>
			<Form method="POST">
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
			</Form>
		</div>
	);
}
