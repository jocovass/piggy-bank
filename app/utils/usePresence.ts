import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useReducer,
	useRef,
	useState,
} from 'react';
import { flushSync } from 'react-dom';

/**
 * This hook was taken from https://github.com/radix-ui/primitives/blob/main/packages/react/presence/src/Presence.tsx#L33
 */
export function usePresence(present: boolean) {
	const [node, setNode] = useState<HTMLElement | null>(null);
	const stylesRef = useRef<CSSStyleDeclaration>({} as any);
	const prevPresentRef = useRef(present);
	const prevAnimationNameRef = useRef<string>('none');
	const initialState = present ? 'mounted' : 'unmounted';
	const [state, send] = useStateMachine(initialState, {
		mounted: {
			UNMOUNT: 'unmounted',
			ANIMATION_OUT: 'unmountSuspended',
		},
		unmountSuspended: {
			MOUNT: 'mounted',
			ANIMATION_END: 'unmounted',
		},
		unmounted: {
			MOUNT: 'mounted',
		},
	});
	console.log('initial state', initialState);
	useEffect(() => {
		const currentAnimationName = getAnimationName(stylesRef.current);
		prevAnimationNameRef.current =
			state === 'mounted' ? currentAnimationName : 'none';
		console.log('useffect');
	}, [state]);

	useLayoutEffect(() => {
		const styles = stylesRef.current;
		const wasPresent = prevPresentRef.current;
		const hasPresentChanged = wasPresent !== present;

		if (hasPresentChanged) {
			const prevAnimationName = prevAnimationNameRef.current;
			const currentAnimationName = getAnimationName(styles);
			console.log('current animation name', currentAnimationName);

			if (present) {
				send('MOUNT');
			} else if (
				currentAnimationName === 'none' ||
				styles?.display === 'none'
			) {
				// If there is no exit animation or the element is hidden, animations won't run
				// so we unmount instantly
				send('UNMOUNT');
			} else {
				/**
				 * When `present` changes to `false`, we check changes to animation-name to
				 * determine whether an animation has started. We chose this approach (reading
				 * computed styles) because there is no `animationrun` event and `animationstart`
				 * fires after `animation-delay` has expired which would be too late.
				 */
				const isAnimating = prevAnimationName !== currentAnimationName;

				if (wasPresent && isAnimating) {
					send('ANIMATION_OUT');
				} else {
					send('UNMOUNT');
				}
			}

			prevPresentRef.current = present;
		}
	}, [present, send]);

	useLayoutEffect(() => {
		if (node) {
			/**
			 * Triggering an ANIMATION_OUT during an ANIMATION_IN will fire an `animationcancel`
			 * event for ANIMATION_IN after we have entered `unmountSuspended` state. So, we
			 * make sure we only trigger ANIMATION_END for the currently active animation.
			 */
			const handleAnimationEnd = (event: AnimationEvent) => {
				const currentAnimationName = getAnimationName(stylesRef.current);
				const isCurrentAnimation = currentAnimationName.includes(
					event.animationName,
				);
				if (event.target === node && isCurrentAnimation) {
					// With React 18 concurrency this update is applied
					// a frame after the animation ends, creating a flash of visible content.
					// By manually flushing we ensure they sync within a frame, removing the flash.
					flushSync(() => send('ANIMATION_END'));
				}
			};
			const handleAnimationStart = (event: AnimationEvent) => {
				if (event.target === node) {
					// if animation occurred, store its name as the previous animation.
					prevAnimationNameRef.current = getAnimationName(stylesRef.current);
				}
			};
			node.addEventListener('animationstart', handleAnimationStart);
			node.addEventListener('animationcancel', handleAnimationEnd);
			node.addEventListener('animationend', handleAnimationEnd);
			return () => {
				node.removeEventListener('animationstart', handleAnimationStart);
				node.removeEventListener('animationcancel', handleAnimationEnd);
				node.removeEventListener('animationend', handleAnimationEnd);
			};
		} else {
			// Transition to the unmounted state if the node is removed prematurely.
			// We avoid doing so during cleanup as the node may change but still exist.
			send('ANIMATION_END');
		}
	}, [node, send]);

	return {
		isPresent: ['mounted', 'unmountSuspended'].includes(state),
		ref: useCallback((node: HTMLElement | null) => {
			if (node) stylesRef.current = getComputedStyle(node);
			setNode(node);
		}, []),
	};
}

function getAnimationName(styles?: CSSStyleDeclaration) {
	return styles?.animationName || 'none';
}

type Machine<S> = { [k: string]: { [k: string]: S } };
type MachineState<T> = keyof T;
type MachineEvent<T> = keyof UnionToIntersection<T[keyof T]>;

// 🤯 https://fettblog.eu/typescript-union-to-intersection/
type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
	x: infer R,
) => any
	? R
	: never;

export function useStateMachine<M>(
	initialState: MachineState<M>,
	machine: M & Machine<MachineState<M>>,
) {
	return useReducer(
		(state: MachineState<M>, event: MachineEvent<M>): MachineState<M> => {
			const nextState = (machine[state] as any)[event];
			return nextState ?? state;
		},
		initialState,
	);
}
