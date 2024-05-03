import { type Config } from 'tailwindcss';
import animatePlugin from 'tailwindcss-animate';
import radixPlugin from 'tailwindcss-radix';
// import { animations } from '~/styles/tailwind-animations';

export default {
	content: ['./app/**/*.{ts,tsx,jsx,js}'],
	darkMode: 'class',
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
	},
	// presets: [animations],
	plugins: [animatePlugin, radixPlugin],
} satisfies Config;
