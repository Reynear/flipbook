import { CLERK_SECRET_KEY } from '$env/static/private';
import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
import { createClerkClient, type User } from '@clerk/backend';
import type { RequestEvent } from '@sveltejs/kit';
import { Data, Effect, Layer, ServiceMap } from 'effect';

export class ClerkError extends Data.TaggedError('ClerkError')<{
	readonly message: string;
	readonly kind: string;
	readonly traceId: string;
	readonly timestamp: number;
	readonly cause?: unknown;
}> {}

interface ClerkDef {
	validateAuth: (event: RequestEvent) => Effect.Effect<User, ClerkError>;
}

export class ClerkService extends ServiceMap.Service<ClerkService, ClerkDef>()('ClerkService') {
	static readonly layer = Layer.sync(ClerkService, () => {
		const clerk = createClerkClient({
			secretKey: CLERK_SECRET_KEY,
			publishableKey: PUBLIC_CLERK_PUBLISHABLE_KEY
		});

		const validateAuth = (event: RequestEvent) =>
			Effect.gen(function* () {
				const { request } = event;

				const auth = yield* Effect.tryPromise({
					try: () => clerk.authenticateRequest(request).then((state) => state.toAuth()),
					catch: (e) =>
						new ClerkError({
							message: e instanceof Error ? e.message : 'Unknown error',
							kind: 'AuthenticationError',
							traceId: crypto.randomUUID(),
							timestamp: Date.now(),
							cause: e
						})
				});

				if (!auth || !auth.isAuthenticated) {
					return yield* Effect.fail(
						new ClerkError({
							message: 'Unauthorized',
							kind: 'AuthenticationError',
							traceId: crypto.randomUUID(),
							timestamp: Date.now(),
							cause: new Error('Unauthorized')
						})
					);
				}

				const user = yield* Effect.tryPromise({
					try: () => clerk.users.getUser(auth.userId),
					catch: (e) =>
						new ClerkError({
							message: e instanceof Error ? e.message : 'Unknown error',
							kind: 'AuthenticationError',
							traceId: crypto.randomUUID(),
							timestamp: Date.now(),
							cause: e
						})
				});

				return user;
			});

		return {
			validateAuth
		};
	});
}
