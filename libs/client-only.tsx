import {
	useSyncExternalStore,
	type ComponentType,
	type ReactNode
} from 'react';

// USAGE
// ---------------------------------------------------------------------------
// Two forms — pick whichever fits the call site.
//
// 1. <ClientOnly> — wrap children inline. Best when only this one place needs
//    to skip SSR. `fallback` is optional (defaults to null); pass a sized
//    placeholder if you care about layout shift.
//
//      import ClientOnly from '@/libs/client-only';
//
//      <ClientOnly fallback={<span>--:--:--</span>}>
//          <Now />
//      </ClientOnly>
//
//    See `app/pages/home.tsx` for a working sample (a live clock that would
//    otherwise mismatch hydration).
//
// 2. clientOnly(Component) — HOC. Use when a component is *intrinsically*
//    client-only (reads window/localStorage, shows user-specific data, etc.).
//    Same render behavior as the wrapper, plus it tags the component so
//    `router.match` will refuse to register it as a page (throws in dev,
//    falls back to the NotFound page in prod):
//
//      import { clientOnly } from '@/libs/client-only';
//
//      const UserBadge = clientOnly(UserBadgeImpl);
//      // <UserBadge /> renders nothing on server, real markup after hydration.
//
// HOW THIS WORKS
// ---------------------------------------------------------------------------
// `useIsClient()` returns `false` during SSR and the first hydration render,
// then `true` after hydration commits. <ClientOnly> uses that flag to render
// `fallback` on the server and the real `children` only once we're live in
// the browser.
//
// It's built on `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`,
// which has a special property: the value is allowed to differ between server
// and client *without* a hydration mismatch warning, as long as both sides
// initially render the same thing. Three callbacks make that work:
//
//   1. getServerSnapshot → false
//      React calls this on the server AND on the first client render (the
//      hydration pass). Both return `false`, so both render `fallback`. The
//      DOM React sees on the client matches the HTML the server sent.
//
//   2. getClientSnapshot → true
//      React calls this only AFTER hydration commits. It returns `true`, so
//      React schedules one extra render that swaps `fallback` for `children`.
//
//   3. subscribe → () => {}
//      `useSyncExternalStore` is normally for subscribing to an external
//      store. We have no store — the value flips exactly once (during the
//      post-hydration commit) and never again. So `subscribe` does nothing
//      and returns a no-op cleanup.
//
// Timeline:
//
//   server render          → getServerSnapshot → false → <fallback />
//   client hydration pass  → getServerSnapshot → false → <fallback />   (matches HTML)
//   post-hydration commit  → getClientSnapshot → true  → <children />
//
// The three callbacks are defined at module scope so their identity is stable
// across renders — `useSyncExternalStore` re-subscribes when `subscribe`'s
// reference changes.
//
// LIMITATION
// ---------------------------------------------------------------------------
// This guards rendering, not module evaluation. A library that touches
// `window` at the top of its module will still execute on the worker on
// import — keep that work inside the component body (effects, lazy refs).

const subscribe = () => {
	return () => {};
};

const getServerSnapshot = () => {
	return false;
};

const getClientSnapshot = () => {
	return true;
};

const useIsClient = () => {
	return useSyncExternalStore(
		subscribe,
		getClientSnapshot,
		getServerSnapshot
	);
};

const clientOnlyRegistry = new WeakSet<object>();

const ClientOnly = ({
	children,
	fallback = null
}: {
	children: ReactNode;
	fallback?: ReactNode;
}) => {
	const isClient = useIsClient();

	if (!isClient) {
		return <>{fallback}</>;
	}

	return <>{children}</>;
};

const clientOnly = <P extends object>(
	Component: ComponentType<P>,
	fallback: ReactNode = null
) => {
	const Wrapped = (props: P) => {
		return (
			<ClientOnly fallback={fallback}>
				<Component {...props} />
			</ClientOnly>
		);
	};

	Wrapped.displayName = `ClientOnly(${Component.displayName ?? Component.name ?? 'Component'})`;
	clientOnlyRegistry.add(Wrapped);

	return Wrapped;
};

const isClientOnly = (Component: unknown): boolean => {
	if (typeof Component !== 'function') {
		return false;
	}

	return clientOnlyRegistry.has(Component);
};

export { clientOnly, isClientOnly };
export default ClientOnly;
